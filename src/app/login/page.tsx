'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    // ログイン済みの場合のみリダイレクト
    if (!loading && user) {
      // すでにトップページの場合は何もしない
      if (window.location.pathname !== '/') {
        router.push('/');
      }
    }
    // userがnull（未ログイン）の場合は何もしない（デモモードで続行可能）
  }, [user, loading, router]);

  const handleGoogleLogin = async () => {
    if (!auth) {
      alert("Firebaseが設定されていません。ログイン機能を使用するには設定が必要です。");
      return;
    }
    
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // Redirection handled by useEffect
    } catch (error: unknown) {
      console.error("Error signing in with Google: ", error);
      const errorMessage = error instanceof Error ? error.message : 'ログインエラーが発生しました';
      alert("ログインに失敗しました。\n" + errorMessage);
    }
  };

  if (loading || user) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  // Firebaseが設定されていない場合
  if (!auth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-6 max-w-md">
          <p className="text-sm">
            <strong>注意:</strong> Firebaseが設定されていません。<br/>
            ログイン機能を使用するには、<code>.env.local</code>ファイルを作成してFirebaseの設定を追加してください。
          </p>
        </div>
        <h1 className="text-3xl font-bold mb-6">QuickPick (デモモード)</h1>
        <button
          onClick={() => router.push('/')}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
        >
          デモモードで続行
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <h1 className="text-3xl font-bold mb-6">QuickPickへようこそ</h1>
      <button
        onClick={handleGoogleLogin}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out mb-4"
      >
        Googleでログイン
      </button>
      <button
        onClick={() => router.push('/')}
        className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300 ease-in-out"
      >
        デモモードで続行
      </button>
    </div>
  );
}
