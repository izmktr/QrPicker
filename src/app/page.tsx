'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from '@/components/QrScanner';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';
import { isUrl } from '@/lib/urlUtils';
import { UrlLink } from '@/components/UrlLink';

interface ScanHistoryItem {
  id: string;
  data: string;
  timestamp: any; // Use firebase.firestore.Timestamp in real app
}

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [showScanner, setShowScanner] = useState(false);
  const [history, setHistory] = useState<ScanHistoryItem[]>([]);

  // Redirect if not logged in (only if Firebase is available)
  useEffect(() => {
    if (!loading && !user && auth) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch history on user change or component mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (user && db) {
        try {
          const q = query(
            collection(db, "scanHistory"),
            where("userId", "==", user.uid),
            orderBy("timestamp", "desc"),
            limit(20)
          );
          const querySnapshot = await getDocs(q);
          const fetchedHistory: ScanHistoryItem[] = [];
          querySnapshot.forEach((doc) => {
            fetchedHistory.push({ id: doc.id, ...doc.data() } as ScanHistoryItem);
          });
          setHistory(fetchedHistory);
        } catch (error) {
          console.error("Error fetching history:", error);
        }
      }
    };
    fetchHistory();
  }, [user]);

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);
    if (user && db) {
      try {
        const docRef = await addDoc(collection(db, "scanHistory"), {
          userId: user.uid,
          data: data,
          timestamp: serverTimestamp(),
        });
        // Add to local history, ensuring it doesn't exceed 20 items
        setHistory(prevHistory => {
          const newHistory = [{ id: docRef.id, data, timestamp: new Date() }, ...prevHistory];
          return newHistory.slice(0, 20);
        });
        const message = isUrl(data) 
          ? `QRコードでURLを読み取りました:\n${data}\n\n🔗 履歴からクリックしてアクセスできます`
          : `QRコードを読み取りました: ${data}`;
        alert(message);
      } catch (e) {
        console.error("Error adding document: ", e);
        alert("履歴の保存に失敗しました。");
      }
    } else if (user && !db) {
      // Firebaseが利用できない場合、ローカルのみに保存
      setHistory(prevHistory => {
        const newHistory = [{ id: Date.now().toString(), data, timestamp: new Date() }, ...prevHistory];
        return newHistory.slice(0, 20);
      });
      const message = isUrl(data) 
        ? `QRコードでURLを読み取りました:\n${data}\n\n🔗 クリックしてアクセスできます\n(注意: Firebaseが設定されていないため、履歴はローカルのみに保存されます)`
        : `QRコードを読み取りました: ${data}\n(注意: Firebaseが設定されていないため、履歴はローカルのみに保存されます)`;
      alert(message);
    } else {
      const message = isUrl(data) 
        ? `QRコードでURLを読み取りました:\n${data}\n\n🔗 ブラウザでアクセスできます\n(注意: ログインしていないため履歴は保存されません)`
        : `QRコードを読み取りました: ${data}\n(注意: ログインしていないため履歴は保存されません)`;
      alert(message);
    }
  }, [user]);

  const handleLogout = async () => {
    // Implement Firebase logout here
    // For now, just redirect to login
    router.push('/login');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Firebaseが設定されていない場合の処理
  if (!db) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 max-w-md">
          <p className="text-sm">
            <strong>注意:</strong> Firebaseが設定されていません。<br/>
            認証機能と履歴保存機能を使用するには、<code>.env.local</code>ファイルを作成してFirebaseの設定を追加してください。
          </p>
        </div>
        <h1 className="text-3xl font-bold mb-4">QR Picker (デモモード)</h1>
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

        {showScanner && (
          <QrScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        )}
      </div>
    );
  }

  if (!user) {
    return null; // Redirect will happen
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
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
                  <UrlLink url={item.data} />
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
    </div>
  );
}
