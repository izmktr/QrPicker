'use client';

import { useState } from 'react';
import QrScanner from '@/components/QrScanner';

export default function TestPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');

  const handleScan = (data: string) => {
    setScanResult(data);
    setShowScanner(false);
    alert(`QRコードが読み取られました: ${data}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-center mb-8">QRスキャナーテスト</h1>
        
        <button
          onClick={() => setShowScanner(true)}
          className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mb-4"
        >
          QRコードをスキャン
        </button>

        {scanResult && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">最後の読み取り結果:</h2>
            <p className="break-all text-sm">{scanResult}</p>
          </div>
        )}

        {showScanner && (
          <QrScanner
            onScan={handleScan}
            onClose={() => setShowScanner(false)}
          />
        )}
      </div>
    </div>
  );
}
