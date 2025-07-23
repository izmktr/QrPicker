'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import QrScanner from '@/components/QrScanner';
import { db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, serverTimestamp } from 'firebase/firestore';

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

  // Redirect if not logged in
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Fetch history on user change or component mount
  useEffect(() => {
    const fetchHistory = async () => {
      if (user) {
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
      }
    };
    fetchHistory();
  }, [user]);

  const handleScan = useCallback(async (data: string) => {
    setShowScanner(false);
    if (user) {
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
        alert(`QRコードを読み取りました: ${data}`);
      } catch (e) {
        console.error("Error adding document: ", e);
        alert("履歴の保存に失敗しました。");
      }
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
              <li key={item.id} className="bg-gray-50 p-2 rounded-md flex justify-between items-center">
                <span className="text-blue-600 break-all">{item.data}</span>
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
