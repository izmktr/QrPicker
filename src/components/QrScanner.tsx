'use client';

import React, { useState } from 'react';
import { useZxing } from 'react-zxing';

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

interface QrScannerInnerProps extends QrScannerProps {
  facingMode: 'user' | 'environment';
}

const QrScannerInner: React.FC<QrScannerInnerProps> = ({ onScan, onClose, facingMode }) => {
  const { ref } = useZxing({
    onDecodeResult(result) {
      onScan(result.getText());
    },
    onError(error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      alert("カメラの起動に失敗しました。ブラウザの設定を確認してください。\n" + errorMessage);
      onClose();
    },
    constraints: {
      video: {
        facingMode: facingMode
      }
    }
  });

  return (
    <video 
      ref={ref} 
      style={{ 
        width: '100%', 
        height: '100%', 
        objectFit: 'cover' 
      }}
    />
  );
};

const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const toggleFacingMode = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-11/12 max-w-md bg-white rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">QRコードをスキャン</h2>
        <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
          <QrScannerInner 
            key={facingMode} 
            onScan={onScan} 
            onClose={onClose} 
            facingMode={facingMode} 
          />
        </div>
        <div className="flex justify-between gap-2">
          <button
            onClick={toggleFacingMode}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
          >
            カメラ切り替え ({facingMode === 'user' ? '前面' : '背面'})
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300 ease-in-out"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrScanner;
