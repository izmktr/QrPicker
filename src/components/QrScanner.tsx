import React, { useState, useCallback } from 'react';
import { QrReader } from 'react-qr-reader';

interface QrScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScan, onClose }) => {
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');

  const handleScan = useCallback((data: string | null) => {
    if (data) {
      onScan(data);
    }
  }, [onScan]);

  const handleError = useCallback((err: Error) => {
    console.error(err);
    alert("カメラの起動に失敗しました。ブラウザの設定を確認してください。\n" + err.message);
    onClose(); // エラー時はスキャナーを閉じる
  }, [onClose]);

  const toggleFacingMode = () => {
    setFacingMode(prevMode => (prevMode === 'user' ? 'environment' : 'user'));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center z-50">
      <div className="relative w-11/12 max-w-md bg-white rounded-lg p-4 shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">QRコードをスキャン</h2>
        <div className="w-full aspect-square overflow-hidden rounded-md mb-4">
          <QrReader
            onResult={(result, error) => {
              if (!!result) {
                handleScan(result?.getText());
              }

              if (!!error) {
                // console.info(error);
              }
            }}
            videoContainerStyle={{ width: '100%', paddingTop: '100%', position: 'relative' }}
            videoStyle={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
            constraints={{
              facingMode: facingMode
            }}
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
