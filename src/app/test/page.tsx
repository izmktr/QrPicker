'use client';

import { useState } from 'react';
import QrScanner from '@/components/QrScanner';
import { isUrl } from '@/lib/urlUtils';
import { UrlLink } from '@/components/UrlLink';

export default function TestPage() {
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');

  const handleScan = (data: string) => {
    setScanResult(data);
    setShowScanner(false);
    const message = isUrl(data) 
      ? `QRコードでURLを読み取りました:\n${data}\n\n🔗 結果エリアのリンクからアクセスできます`
      : `QRコードを読み取りました: ${data}`;
    alert(message);
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
            {isUrl(scanResult) ? (
              <UrlLink url={scanResult} />
            ) : (
              <p className="break-all text-sm text-gray-800">{scanResult}</p>
            )}
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
