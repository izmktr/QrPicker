'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from '@/components/QrScanner';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, limit, getDocs, serverTimestamp, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { isUrl } from '@/lib/urlUtils';
import { UrlLink } from '@/components/UrlLink';
import { InstallPrompt } from '@/components/InstallPrompt';
import { removeDuplicateHistory, removeDuplicateFromLocalHistory, deduplicateHistory } from '@/lib/historyUtils';

interface ScanHistoryItem {
  id: string;
  data: string;
  title?: string;
  memo?: string;
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
  const [editingMemo, setEditingMemo] = useState<string | null>(null);
  const [memoText, setMemoText] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');

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

  // 手入力URLを追加する関数
  const handleAddUrl = useCallback(async () => {
    if (!urlInput.trim()) {
      showNotification('URLを入力してください', 'warning');
      return;
    }

    // URLかどうかチェック
    if (!isUrl(urlInput.trim())) {
      showNotification('有効なURLを入力してください', 'warning');
      return;
    }

    const url = urlInput.trim();
    setShowUrlInput(false);
    setUrlInput('');

    // handleScanと同じ処理を実行
    if (user && db) {
      try {
        // まず既存の重複データを削除
        const existingMemo = await removeDuplicateHistory(user.uid, url);

        let title = '';
        try {
          const res = await fetch('/api/get-title', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const result = await res.json();
            title = result.title || '';
          }
        } catch (e) {
          title = '';
        }

        // 新しいデータを追加
        const docRef = await addDoc(collection(db, "scanHistory"), {
          userId: user.uid,
          data: url,
          title,
          ...(existingMemo ? { memo: existingMemo } : {}),
          timestamp: serverTimestamp(),
        });

        // ローカル履歴も更新（重複削除 + 新規追加）
        setHistory(prevHistory => {
          const localMemo = prevHistory.find(item => item.data === url)?.memo;
          const carriedMemo = existingMemo || localMemo;
          const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, url);
          const newHistory = [{ id: docRef.id, data: url, title, ...(carriedMemo ? { memo: carriedMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
          return newHistory.slice(0, 20);
        });
        
        showNotification('URLを追加しました', 'success', true, url);
      } catch (e) {
        console.error("Error adding document: ", e);
        showNotification("履歴の保存に失敗しました。", 'warning');
      }
    } else if (user && !db) {
      // Firebaseが利用できない場合、ローカルのみに保存（重複削除）
      setHistory(prevHistory => {
        const existingMemo = prevHistory.find(item => item.data === url)?.memo;
        const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, url);
        const newHistory = [{ id: Date.now().toString(), data: url, ...(existingMemo ? { memo: existingMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
        return newHistory.slice(0, 20);
      });
      showNotification('URLを追加しました（ローカル保存）', 'info', true, url);
    } else {
      showNotification('URLを追加しました（履歴保存なし）', 'warning', true, url);
    }
  }, [urlInput, user, showNotification]);

  // URL入力をキャンセルする関数
  const handleCancelUrlInput = useCallback(() => {
    setShowUrlInput(false);
    setUrlInput('');
  }, []);

  // クリップボードからURLをペーストする関数
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText.trim()) {
          setUrlInput(clipboardText.trim());
          showNotification('クリップボードからURLをペーストしました', 'info');
        } else {
          showNotification('クリップボードが空です', 'warning');
        }
      } else {
        showNotification('このブラウザではクリップボード機能がサポートされていません', 'warning');
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
      showNotification('クリップボードの読み取りに失敗しました', 'warning');
    }
  }, [showNotification]);

  // Fetch history on user change or component mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (user && db) {
        try {
          console.log('Fetching history for user:', user.uid);
          
          // より多くのデータを取得して確認
          const q = query(
            collection(db, "scanHistory"),
            where("userId", "==", user.uid),
            limit(100) // 取得件数を増加
          );
          const querySnapshot = await getDocs(q);
          const fetchedHistory: ScanHistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            console.log('Document data:', { id: doc.id, ...data });
            fetchedHistory.push({ id: doc.id, ...data } as ScanHistoryItem);
          });
          
          console.log('Total fetched documents:', fetchedHistory.length);
          
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
          
          console.log('Sorted history length:', sortedHistory.length);
          
          // 表示件数を増やし、重複削除をより緩やかに（最新100件表示）
          // 同じURLでも時間が違えば別エントリとして保持
          const finalHistory = sortedHistory.slice(0, 100);
          console.log('Final history length:', finalHistory.length);
          setHistory(finalHistory);
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      } else {
        console.log('User or db not available:', { user: !!user, db: !!db });
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
            const existingMemo = await removeDuplicateHistory(user.uid, sharedUrl);

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
              ...(existingMemo ? { memo: existingMemo } : {}),
              timestamp: serverTimestamp(),
            });

            // ローカル履歴も更新
            setHistory(prevHistory => {
              const localMemo = prevHistory.find(item => item.data === sharedUrl)?.memo;
              const carriedMemo = existingMemo || localMemo;
              const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, sharedUrl);
              const newHistory = [{ id: docRef.id, data: sharedUrl, title, ...(carriedMemo ? { memo: carriedMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
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
            const existingMemo = prevHistory.find(item => item.data === sharedUrl)?.memo;
            const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, sharedUrl);
            const newHistory = [{ id: Date.now().toString(), data: sharedUrl, title: sharedTitle || undefined, ...(existingMemo ? { memo: existingMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
            return newHistory.slice(0, 20);
          });
          showNotification('Safariから共有されたページを履歴に追加しました（ローカル保存）', 'info', true, sharedUrl);
        }
      }
    };

    handleSharedUrl();
  }, [user, showNotification]);

  // メモを更新する関数
  const handleUpdateMemo = useCallback(async (itemId: string, newMemo: string) => {
    if (user && db) {
      try {
        // Firebaseのメモを更新
        await updateDoc(doc(db, "scanHistory", itemId), {
          memo: newMemo
        });
        
        // ローカル履歴も更新
        setHistory(prevHistory => 
          prevHistory.map(item => 
            item.id === itemId ? { ...item, memo: newMemo } : item
          )
        );
        
        showNotification('メモを更新しました', 'success');
      } catch (error) {
        console.error('Error updating memo:', error);
        showNotification('メモの更新に失敗しました', 'warning');
      }
    } else {
      // ログインしていない場合はローカルのみ更新
      setHistory(prevHistory => 
        prevHistory.map(item => 
          item.id === itemId ? { ...item, memo: newMemo } : item
        )
      );
      showNotification('メモを更新しました（ローカル）', 'info');
    }
    
    // 編集状態をリセット
    setEditingMemo(null);
    setMemoText('');
  }, [user, showNotification]);

  // メモ編集を開始する関数
  const handleStartEditMemo = useCallback((itemId: string, currentMemo: string) => {
    setEditingMemo(itemId);
    setMemoText(currentMemo || '');
  }, []);

  // メモ編集をキャンセルする関数
  const handleCancelEditMemo = useCallback(() => {
    setEditingMemo(null);
    setMemoText('');
  }, []);

  // 履歴アイテムを削除する関数
  const handleDeleteHistoryItem = useCallback(async (itemId: string, itemData: string) => {
    if (user && db) {
      try {
        // Firebaseから削除
        await deleteDoc(doc(db, "scanHistory", itemId));
        
        // ローカル履歴からも削除
        setHistory(prevHistory => prevHistory.filter(item => item.id !== itemId));
        
        showNotification('履歴を削除しました', 'success');
      } catch (error) {
        console.error('Error deleting history item:', error);
        showNotification('履歴の削除に失敗しました', 'warning');
      }
    } else {
      // ログインしていない場合はローカルのみから削除
      setHistory(prevHistory => prevHistory.filter(item => item.id !== itemId));
      showNotification('履歴を削除しました（ローカル）', 'info');
    }
  }, [user, showNotification]);

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);
    if (user && db) {
      try {
        // まず既存の重複データを削除
        const existingMemo = await removeDuplicateHistory(user.uid, data);

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
          ...(existingMemo ? { memo: existingMemo } : {}),
          timestamp: serverTimestamp(),
        });

        // ローカル履歴も更新（重複削除 + 新規追加）
        setHistory(prevHistory => {
          const localMemo = prevHistory.find(item => item.data === data)?.memo;
          const carriedMemo = existingMemo || localMemo;
          const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, data);
          const newHistory = [{ id: docRef.id, data, title, ...(carriedMemo ? { memo: carriedMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
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
        const existingMemo = prevHistory.find(item => item.data === data)?.memo;
        const historyWithoutDuplicates = removeDuplicateFromLocalHistory(prevHistory, data);
        const newHistory = [{ id: Date.now().toString(), data, ...(existingMemo ? { memo: existingMemo } : {}), timestamp: new Date() }, ...historyWithoutDuplicates];
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
    try {
      if (auth) {
        const { signOut } = await import('firebase/auth');
        
        // ログアウト実行
        await signOut(auth);
        
        // 状態をクリア
        setHistory([]);
        setNotification(null);
        
        // router.pushを使用（優雅な遷移）
        router.push('/login');
        
        // 念のため、少し待ってからページリロード（キャッシュクリア）
        setTimeout(() => {
          if (window.location.pathname === '/login') {
            window.location.reload();
          }
        }, 500);
      } else {
        // Firebaseが設定されていない場合は単純にリダイレクト
        router.push('/login');
      }
    } catch (e) {
      console.error('Logout failed:', e);
      // エラーが発生した場合は強制リロード
      window.location.href = '/login';
    }
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
        <div className="flex gap-4 mb-4">
          <button
            onClick={() => setShowScanner(true)}
            className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            QRコードをスキャン
          </button>
          <button
            onClick={() => setShowUrlInput(true)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            URLを追加
          </button>
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className={`font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
              deleteMode 
                ? 'bg-red-500 hover:bg-red-700 text-white' 
                : 'bg-gray-500 hover:bg-gray-700 text-white'
            }`}
          >
            {deleteMode ? '削除モード終了' : '削除モード'}
          </button>
        </div>

        {/* URL入力フォーム */}
        {showUrlInput && (
          <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4 mb-4">
            <h3 className="text-lg font-bold mb-2">URLを追加</h3>
            <div className="flex gap-2 mb-2">
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://example.com"
                className="flex-1 p-2 border border-gray-300 rounded"
                onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
              />
              <button
                onClick={handlePasteFromClipboard}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded transition-colors"
                title="ペースト"
              >
                📋
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddUrl}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
              >
                追加
              </button>
              <button
                onClick={handleCancelUrlInput}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
              >
                キャンセル
              </button>
            </div>
          </div>
        )}

        <div className="w-full max-w-6xl bg-white rounded-lg shadow-md p-4">
          <h2 className="text-xl font-bold mb-4">読み取り履歴</h2>
          {history.length === 0 ? (
            <p className="text-gray-600">履歴はありません。</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="bg-gray-50 p-3 rounded-md border border-gray-200 flex flex-col">
                  <div className="flex-1 mb-2">
                    {isUrl(item.data) ? (
                      <UrlLink url={item.data} title={item.title} />
                    ) : (
                      <span className="text-gray-800 break-all text-sm">{item.data}</span>
                    )}
                  </div>
                  
                  {/* メモ表示・編集部分 */}
                  <div className="mb-2">
                    {editingMemo === item.id ? (
                      <div className="space-y-2">
                        <textarea
                          value={memoText}
                          onChange={(e) => setMemoText(e.target.value)}
                          placeholder="メモを入力..."
                          className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateMemo(item.id, memoText)}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancelEditMemo}
                            className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                          >
                            キャンセル
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        {item.memo ? (
                          <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <p className="text-xs text-blue-800 whitespace-pre-wrap">{item.memo}</p>
                          </div>
                        ) : (
                          <div className="text-xs text-gray-400 italic">メモなし</div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">
                        {item.timestamp && (
                          item.timestamp instanceof Date 
                            ? item.timestamp.toLocaleString('ja-JP')
                            : typeof item.timestamp === 'object' && 'seconds' in item.timestamp
                              ? new Date(item.timestamp.seconds * 1000).toLocaleString('ja-JP')
                              : ''
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {editingMemo !== item.id && (
                        <button
                          onClick={() => handleStartEditMemo(item.id, item.memo || '')}
                          className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                          title="メモを編集"
                        >
                          📝 メモ
                        </button>
                      )}
                      {deleteMode && (
                        <button
                          onClick={() => handleDeleteHistoryItem(item.id, item.data)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-2 rounded-lg transition-colors"
                          title="削除"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4 mt-8">
          <button
            onClick={() => router.push('/login')}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
          >
            ログイン画面へ
          </button>
          <button
            onClick={() => setDeleteMode(!deleteMode)}
            className={`font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
              deleteMode 
                ? 'bg-red-500 hover:bg-red-700 text-white' 
                : 'bg-gray-500 hover:bg-gray-700 text-white'
            }`}
          >
            {deleteMode ? '削除モード終了' : '削除モード'}
          </button>
        </div>

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
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => setShowScanner(true)}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          QRコードをスキャン
        </button>
        <button
          onClick={() => setShowUrlInput(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          URLを追加
        </button>
        <button
          onClick={() => setDeleteMode(!deleteMode)}
          className={`font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
            deleteMode 
              ? 'bg-red-500 hover:bg-red-700 text-white' 
              : 'bg-gray-500 hover:bg-gray-700 text-white'
          }`}
        >
          {deleteMode ? '削除モード終了' : '削除モード'}
        </button>
      </div>

      {/* URL入力フォーム */}
      {showUrlInput && (
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-4 mb-4">
          <h3 className="text-lg font-bold mb-2">URLを追加</h3>
          <div className="flex gap-2 mb-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 p-2 border border-gray-300 rounded"
              onKeyDown={(e) => e.key === 'Enter' && handleAddUrl()}
            />
            <button
              onClick={handlePasteFromClipboard}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-3 rounded transition-colors"
              title="ペースト"
            >
              📋
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAddUrl}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded"
            >
              追加
            </button>
            <button
              onClick={handleCancelUrlInput}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-1 px-3 rounded"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-6xl bg-white rounded-lg shadow-md p-4">
        <h2 className="text-xl font-bold mb-4">読み取り履歴</h2>
        {history.length === 0 ? (
          <p className="text-gray-600">履歴はありません。</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {history.map((item) => (
              <div key={item.id} className="bg-gray-50 p-3 rounded-md border border-gray-200 flex flex-col">
                <div className="flex-1 mb-2">
                  {isUrl(item.data) ? (
                    <UrlLink url={item.data} title={item.title} />
                  ) : (
                    <span className="text-gray-800 break-all text-sm">{item.data}</span>
                  )}
                </div>
                
                {/* メモ表示・編集部分 */}
                <div className="mb-2">
                  {editingMemo === item.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={memoText}
                        onChange={(e) => setMemoText(e.target.value)}
                        placeholder="メモを入力..."
                        className="w-full p-2 text-sm border border-gray-300 rounded resize-none"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateMemo(item.id, memoText)}
                          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancelEditMemo}
                          className="px-2 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600"
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {item.memo ? (
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs text-blue-800 whitespace-pre-wrap">{item.memo}</p>
                        </div>
                      ) : (
                        <div className="text-xs text-gray-400 italic">メモなし</div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {item.timestamp && (
                        item.timestamp instanceof Date 
                          ? item.timestamp.toLocaleString('ja-JP')
                          : typeof item.timestamp === 'object' && 'seconds' in item.timestamp
                            ? new Date(item.timestamp.seconds * 1000).toLocaleString('ja-JP')
                            : ''
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {editingMemo !== item.id && (
                      <button
                        onClick={() => handleStartEditMemo(item.id, item.memo || '')}
                        className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                        title="メモを編集"
                      >
                        📝 メモ
                      </button>
                    )}
                    {deleteMode && (
                      <button
                        onClick={() => handleDeleteHistoryItem(item.id, item.data)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 px-2 py-2 rounded-lg transition-colors"
                        title="削除"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-8">
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          ログアウト
        </button>
        <button
          onClick={() => setDeleteMode(!deleteMode)}
          className={`font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out ${
            deleteMode 
              ? 'bg-red-500 hover:bg-red-700 text-white' 
              : 'bg-gray-500 hover:bg-gray-700 text-white'
          }`}
        >
          {deleteMode ? '削除モード終了' : '削除モード'}
        </button>
      </div>

      {showScanner && (
        <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
      )}

      <InstallPrompt />
    </div>
  );
}
