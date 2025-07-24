
# Quick Pick

QRコードを読み取り、履歴を管理できるモダンなウェブアプリケーションです。

## 概要

Quick Pickは、カメラでQRコードを読み取り、履歴として保存・管理できるアプリです。URLの場合はページタイトルを自動取得し、履歴に「タイトル＋URL」を大きく見やすく表示します。重複履歴は自動整理され、Google認証でクラウド同期も可能です。

### 主な機能

- 📱 **リアルタイムQRコードスキャン**: カメラでQRコードを瞬時に読み取り
- 🔗 **URLタイトル表示**: URLの場合はページタイトルを自動取得し、履歴に大きく表示
- 📝 **履歴管理**: 読み取り結果を自動保存し、重複は最新のみ保持
- 🔄 **カメラ切り替え**: 前面・背面カメラの切り替え
- 🔐 **Google認証**: Firebaseによる安全な認証
- 💾 **クラウド同期**: Firestoreで履歴をクラウド保存
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ両対応
- 🎯 **デモモード**: Firebase設定なしでも基本機能を体験可能

### 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript
- **スタイリング**: Tailwind CSS
- **QRコード読み取り**: react-zxing
- **認証・データベース**: Firebase (Authentication + Firestore)
- **デプロイ**: Vercel対応

> This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).


## セットアップ手順

### 前提条件

- Node.js 18.0以上
- npm, yarn, pnpm, または bun
- カメラアクセス可能なモダンブラウザ

### 1. プロジェクトのクローンと依存関係インストール

```bash
git clone https://github.com/izmktr/QrPicker.git
cd QrPicker
npm install # または yarn/pnpm/bun
```

### 2. Firebaseのセットアップ（任意）

Firebase未設定でもデモモードで利用可能。Google認証・クラウド履歴保存を使う場合のみ必要です。

1. [Firebase Console](https://console.firebase.google.com/)で新規プロジェクト作成
2. Authentication → Sign-in method → Googleプロバイダー有効化
3. Firestore Database → データベース作成（本番モード推奨）
4. プロジェクト設定 → 「ウェブアプリ追加」でfirebaseConfig取得
5. プロジェクト直下に `.env.local` を作成し、下記内容を記入

```env
NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
```

6. Firestoreセキュリティルール例

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /scanHistory/{document} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
    }
  }
}
```

7. インデックスエラーが出た場合は、Firebase Consoleのリンクから複合インデックスを作成

### 3. 開発サーバー起動

```bash
npm run dev # または yarn/pnpm/bun
```

http://localhost:3000 をブラウザで開く

### 4. 使用方法

- **デモモード**（Firebase未設定）: QRコードスキャン＋ローカル履歴保存
- **フルモード**（Firebase設定済）: Googleログイン＋クラウド履歴保存＋デバイス間同期

## 履歴表示仕様

- URLの場合はページタイトルを自動取得し、履歴に「タイトル（大きく濃い文字）＋URL（クリップアイコン付き）」で表示
- QRコード内容がURL以外の場合はそのままテキスト表示
- 履歴は重複排除・最新20件のみ表示

## 使用可能なスクリプト

```bash
npm run dev       # 開発サーバー起動
npm run build     # 本番ビルド作成
npm run start     # 本番ビルド起動
npm run lint      # ESLint実行
```

## プロジェクト構造

src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # メインページ
│   ├── login/             # ログインページ
│   └── test/              # テストページ
├── components/            # Reactコンポーネント
│   ├── QrScanner.tsx      # QRスキャナー
│   ├── UrlLink.tsx        # URLリンク＋タイトル表示
│   └── ClientAuthProvider.tsx # 認証プロバイダー
├── contexts/              # Reactコンテキスト
│   └── AuthContext.tsx    # 認証コンテキスト
└── lib/                   # ユーティリティ
    ├── firebase.ts        # Firebase設定
    ├── urlUtils.ts        # URL判定・リンク
    └── historyUtils.ts    # 履歴重複排除

## 技術的な特徴

### QRコードスキャン
- `react-zxing`でリアルタイム検出
- 前面・背面カメラ切り替え

### 履歴管理
- 履歴はFirestoreまたはローカル保存
- URLはタイトル付きで表示
- 重複履歴は自動削除

### 認証
- Firebase Authentication（Googleログイン）
- ユーザーごとに履歴分離

### レスポンシブデザイン
- Tailwind CSSでモバイル・PC両対応

## デプロイ

### Vercelでのデプロイ（推奨）

1. [Vercel](https://vercel.com)でアカウント作成
2. GitHubリポジトリを接続
3. Vercelの環境変数設定画面で`.env.local`と同じ内容を追加
4. Firebase Consoleで以下を追加設定：
   - Authentication → Settings → Authorized domains にVercelドメイン追加
   - Authentication → Sign-in method → Googleの承認済みドメインにも追加
5. 自動デプロイ開始

#### Firebase設定（Vercel用）

1. Authentication → Settings → Authorized domains
   - 例：`your-app.vercel.app` を追加
2. Authentication → Sign-in method → Google
   - 承認済みJavaScript生成元: `https://your-app.vercel.app`
   - 承認済みリダイレクトURI: `https://your-app.vercel.app/__/auth/handler`

#### トラブルシューティング

- ログインエラー時はブラウザのコンソールログを確認
- Vercelの環境変数が正しいか確認
- Firebase Consoleのドメイン設定を再確認

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。

## 使用可能なスクリプト

プロジェクトディレクトリで実行できるコマンド:

```bash
npm run dev       # 開発サーバーを起動
npm run build     # 本番用ビルドを作成
npm run start     # 本番ビルドを起動
npm run lint      # ESLintを実行
```

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx         # ルートレイアウト
│   ├── page.tsx           # メインページ
│   ├── login/             # ログインページ
│   └── test/              # テストページ
├── components/            # Reactコンポーネント
│   ├── QrScanner.tsx      # QRスキャナーコンポーネント
│   ├── UrlLink.tsx        # URLリンクコンポーネント
│   └── ClientAuthProvider.tsx # 認証プロバイダー
├── contexts/              # Reactコンテキスト
│   └── AuthContext.tsx    # 認証コンテキスト
└── lib/                   # ユーティリティ
    ├── firebase.ts        # Firebase設定
    ├── urlUtils.ts        # URL関連ユーティリティ
    └── historyUtils.ts    # 履歴関連ユーティリティ
```

## 技術的な特徴

### QRコードスキャン
- `react-zxing` ライブラリを使用
- リアルタイムでカメラからQRコードを検出
- 前面・背面カメラの切り替え対応

### 履歴管理
- 重複する履歴の自動削除（最新のもののみ保持）
- URLの場合は自動的にリンクとして表示
- 外部リンクは新しいタブで開く

### 認証
- Firebase Authentication with Google Sign-In
- セキュアなユーザー認証
- ユーザー固有のデータ分離

### レスポンシブデザイン
- Tailwind CSSによるモバイルファーストデザイン
- 様々な画面サイズに対応

## トラブルシューティング

### カメラが起動しない
- ブラウザのカメラ許可を確認
- HTTPS環境での実行を推奨
- プライベートブラウジングモードでは制限される場合があります

### Firebaseエラー
- `.env.local` ファイルの設定値を確認
- Firebase Console でプロジェクト設定を確認
- インデックス作成のエラーメッセージ内のリンクをクリック

### ビルドエラー
- Node.js のバージョンを確認（18.0以上推奨）
- `npm install` で依存関係を再インストール

## デプロイ

### Vercel でのデプロイ（推奨）

1. [Vercel](https://vercel.com) アカウントを作成
2. GitHubリポジトリを接続
3. 環境変数を Vercel の設定画面で追加（`.env.local`と同じ内容）
4. **重要**: Firebase Console で以下を設定：
   - **Authentication** → **Settings** → **Authorized domains** に Vercel ドメインを追加
   - **Authentication** → **Sign-in method** → **Google** の承認済みドメインにも追加
5. 自動デプロイが開始されます

#### Vercelデプロイ時のFirebase設定

**Firebase Console での追加設定:**
1. **Authentication** → **Settings** → **Authorized domains**
   - あなたのVercelドメイン（例：`your-app.vercel.app`）を追加
2. **Authentication** → **Sign-in method** → **Google**
   - 承認済みのJavaScriptの生成元: `https://your-app.vercel.app`
   - 承認済みのリダイレクトURI: `https://your-app.vercel.app/__/auth/handler`

**トラブルシューティング:**
- ログインエラーが発生する場合は、ブラウザの開発者ツールでコンソールログを確認
- Firebase設定の環境変数がVercelで正しく設定されているか確認
- Firebase Console のドメイン設定を再確認

詳細は [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) を参照してください。


## ライセンス

MIT License

## 貢献

バグ報告・機能提案・プルリクエスト歓迎です！

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs) - Next.js公式ドキュメント
- [Learn Next.js](https://nextjs.org/learn) - Next.jsチュートリアル
- [Firebase Documentation](https://firebase.google.com/docs) - Firebase公式
- [react-zxing](https://www.npmjs.com/package/react-zxing) - QRコードスキャン
- [Tailwind CSS](https://tailwindcss.com/docs) - CSSフレームワーク

---

⭐ このプロジェクトが役に立った場合は、GitHubでスターをお願いします！
