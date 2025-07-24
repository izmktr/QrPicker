'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from '@/components/QrScanner';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { isUrl } from '@/lib/urlUtils';
import { UrlLink } from '@/components/UrlLink';
import { InstallPrompt } from '@/components/InstallPrompt';
import { removeDuplicateHistory, removeDuplicateFromLocalHistory, deduplicateHistory } from '@/lib/historyUtils';

interface ScanHistoryItem {
  id: string;
  data: string;
  title?: string;
  timestamp: Date | { seconds: number } | null; // Firebase Timestamp or Date
}

interface NotificationMessage {
  id: string;
  message: string;
  type: 'success' | 'info' | 'warning';
  isUrl?: boolean;
  url?: string;
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // 通知を表示する関数
  const showNotification = useCallback((message: string, type: 'success' | 'info' | 'warning', isUrl = false, url?: string) => {
    const id = Date.now().toString();
    setNotification({ id, message, type, isUrl, url });
    
    // 5秒後に自動的に通知を消す
    setTimeout(() => {
      setNotification(prev => prev?.id === id ? null : prev);
    }, 5000);
  }, []);

  // 通知を手動で消す関数
  const dismissNotification = useCallback(() => {
    setNotification(null);
  }, []);

  // Fetch history on user change or component mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (user && db) {
        try {
          // インデックスエラーを避けるため、orderByを削除
          const q = query(
            collection(db, "scanHistory"),
            where("userId", "==", user.uid),
            limit(50) // 多めに取得してクライアントサイドでソート
          );
          const querySnapshot = await getDocs(q);
          const fetchedHistory: ScanHistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            fetchedHistory.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
          });
          
          // クライアントサイドでタイムスタンプでソート（降順）
          const sortedHistory = fetchedHistory.sort((a, b) => {
            const getTimestamp = (timestamp: Date | { seconds: number } | null): number => {
              if (!timestamp) return 0;
              if (timestamp instanceof Date) return timestamp.getTime();
              if (typeof timestamp === 'object' && 'seconds' in timestamp) return timestamp.seconds * 1000;
              return 0;
            };
            
            return getTimestamp(b.timestamp) - getTimestamp(a.timestamp);
          });
          
          // 重複を削除してから設定（最新20件）
          const deduplicatedHistory = deduplicateHistory(sortedHistory).slice(0, 20);
          setHistory(deduplicatedHistory);
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      }
    };
    fetchHistory();
  }, [user]);

  // 共有されたURLを処理する
  useEffect(() => {
    const handleSharedUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedUrl = urlParams.get('shared_url');
      const sharedTitle = urlParams.get('shared_title');

      if (sharedUrl) {
        // URLパラメータをクリア
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('shared_url');
        newUrl.searchParams.delete('shared_title');
        window.history.replaceState({}, '', newUrl.toString());

        // 共有されたURLを履歴に追加
        if (user && db) {
          try {
            // 既存の重複データを削除
            await removeDuplicateHistory(user.uid, sharedUrl);

            // タイトルが提供されていない場合は取得を試行
            let title = sharedTitle || '';
            if (!title && isUrl(sharedUrl)) {
              try {
                const res = await fetch('/api/get-title', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: sharedUrl }),
                });
                if (res.ok) {
                  const result = await res.json();
                  title = result.title || '';
                }
              } catch (e) {
                title = '';
              }
            }

            // Firebaseに保存
            const docRef = await addDoc(collection(db, "scanHistory"), {
              userId: user.uid,
              data: sharedUrl,
              title,
              timestamp: serverTimestamp(),
            });

            // ローカル履歴も更新
            setHistory(prevHistory => {
              const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, sharedUrl);
              const newHistory = [{ id: docRef.id, data: sharedUrl, title, timestamp: new Date() }, ...historyWithoutDuplicates];
              return newHistory.slice(0, 20);
            });

            showNotification('Safariから共有されたページを履歴に追加しました', 'success', true, sharedUrl);
          } catch (error) {
            console.error('Error saving shared URL:', error);
            showNotification('共有されたページの保存に失敗しました', 'warning');
          }
        } else {
          // ログインしていない場合はローカルのみに保存
          setHistory(prevHistory => {
            const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, sharedUrl);
            const newHistory = [{ id: Date.now().toString(), data: sharedUrl, title: sharedTitle || undefined, timestamp: new Date() }, ...historyWithoutDuplicates];
            return newHistory.slice(0, 20);
          });
          showNotification('Safariから共有されたページを履歴に追加しました（ローカル保存）', 'info', true, sharedUrl);
        }
      }
    };

    handleSharedUrl();
  }, [user, showNotification]);

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);
    if (user && db) {
      try {
        // まず既存の重複データを削除
        await removeDuplicateHistory(user.uid, data);

        let title = '';
        if (isUrl(data)) {
          try {
            const res = await fetch('/api/get-title', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: data }),
            });
            if (res.ok) {
              const result = await res.json();
              title = result.title || '';
            }
          } catch (e) {
            // タイトル取得失敗時は空欄
            title = '';
          }
        }

        // 新しいデータを追加
        const docRef = await addDoc(collection(db, "scanHistory"), {
          userId: user.uid,
          data: data,
          title,
          timestamp: serverTimestamp(),
        });

        // ローカル履歴も更新（重複削除 + 新規追加）
        setHistory(prevHistory => {
          const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, data);
          const newHistory = [{ id: docRef.id, data, title, timestamp: new Date() }, ...historyWithoutDuplicates];
          return newHistory.slice(0, 20);
        });
        
        if (isUrl(data)) {
          showNotification(`URLを読み取りました`, 'success', true, data);
        } else {
          showNotification(`QRコードを読み取りました: ${data}`, 'success');
        }
      } catch (e) {
        console.error("Error adding document: ", e);
        showNotification("履歴の保存に失敗しました。", 'warning');
      }
    } else if (user && !db) {
      // Firebaseが利用できない場合、ローカルのみに保存（重複削除）
      setHistory(prevHistory => {
        const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, data);
        const newHistory = [{ id: Date.now().toString(), data, timestamp: new Date() }, ...historyWithoutDuplicates];
        return newHistory.slice(0, 20);
      });
      if (isUrl(data)) {
        showNotification(`URLを読み取りました（ローカル保存）`, 'info', true, data);
      } else {
        showNotification(`QRコードを読み取りました: ${data}（ローカル保存）`, 'info');
      }
    } else {
      if (isUrl(data)) {
        showNotification(`URLを読み取りました（履歴保存なし）`, 'warning', true, data);
      } else {
        showNotification(`QRコードを読み取りました: ${data}（履歴保存なし）`, 'warning');
      }
    }
  }, [user, showNotification]);

  const handleLogout = async () => {
    // Firebaseログアウト処理
    try {
      if (auth) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
      }
    } catch (e) {
      console.error('Logout failed:', e);
    }
    router.push('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }


  // ログインしていない場合 or Firebase未設定の場合は必ずデモモードUIを表示
  if (!user || !db) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        {/* 通知表示 */}
        {notification && (
          <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 p-4 rounded-lg shadow-lg ${
            notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
            notification.type === 'info' ? 'bg-blue-100 border border-blue-400 text-blue-700' :
            'bg-yellow-100 border border-yellow-400 text-yellow-700'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                {notification.isUrl && notification.url && (
                  <a 
                    href={notification.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 block break-all"
                  >
                    🔗 {notification.url}
                  </a>
                )}
              </div>
              <button
                onClick={dismissNotification}
                className="ml-2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>
        )}
        {/* Firebase未設定時のみ注意表示 */}
        {!db && (
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 max-w-md">
            <p className="text-sm">
              <strong>注意:</strong> Firebaseが設定されていません。<br/>
              認証機能と履歴保存機能を使用するには、<code>.env.local</code>ファイルを作成してFirebaseの設定を追加してください。
            </p>
          </div>
        )}
        <h1 className="text-3xl font-bold mb-4">QuickPick (デモモード)</h1>
        <button
          onClick={() => setShowScanner(true)}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-4"
        >
          QRコードをスキャン (履歴保存なし)
        </button>

        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-bold mb-2">読み取り履歴</h2>
          {history.length === 0 ? (
            <p className="text-gray-600">履歴はありません。</p>
          ) : (
            <ul className="space-y-2">
              {history.map((item) => (
                <li key={item.id} className="bg-gray-50 p-2 rounded-md">
                  {isUrl(item.data) ? (
                    <UrlLink url={item.data} />
                  ) : (
                    <span className="text-gray-800 break-all text-sm">{item.data}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          onClick={() => router.push('/login')}
          className="mt-8 bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          ログイン画面へ
        </button>

        {showScanner && (
          <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}

        <InstallPrompt />
      </div>
    );
  }

  // ログイン済みの場合は通常UI（Firebase連携あり）
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* 通知表示 */}
      {notification && (
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 p-4 rounded-lg shadow-lg ${
          notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' :
          notification.type === 'info' ? 'bg-blue-100 border border-blue-400 text-blue-700' :
          'bg-yellow-100 border border-yellow-400 text-yellow-700'
        }`}>
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <p className="text-sm font-medium">{notification.message}</p>
              {notification.isUrl && notification.url && (
                <a 
                  href={notification.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline text-sm mt-1 block break-all"
                >
                  🔗 {notification.url}
                </a>
              )}
            </div>
            <button
              onClick={dismissNotification}
              className="ml-2 text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <h1 className="text-3xl font-bold mb-4">ようこそ、{user.displayName || user.email}さん！</h1>
      <button
        onClick={() => setShowScanner(true)}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-4"
      >
        QRコードをスキャン
      </button>

      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-2">読み取り履歴</h2>
        {history.length === 0 ? (
          <p className="text-gray-600">履歴はありません。</p>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => (
              <li key={item.id} className="bg-gray-50 p-2 rounded-md">
                {isUrl(item.data) ? (
                  <UrlLink url={item.data} title={item.title} />
                ) : (
                  <span className="text-gray-800 break-all text-sm">{item.data}</span>
                )}
                {/* ゴミ箱アイコンは後で実装 */}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button
        onClick={handleLogout}
        className="mt-8 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
      >
        ログアウト
      </button>

      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <InstallPrompt />
    </div>
  );
}
