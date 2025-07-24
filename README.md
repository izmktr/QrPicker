# Quick Pick

QRコードを読み取り、履歴を管理できるモダンなウェブアプリケーションです。

## 概要

Quick Pickは、カメラを使用してQRコードを読み取り、結果を履歴として保存・管理できるアプリケーションです。URLの場合は直接アクセス可能なリンクとして表示され、重複する履歴は自動的に整理されます。

### 主な機能

- 📱 **リアルタイムQRコードスキャン**: カメラを使用してQRコードを瞬時に読み取り
- 🔗 **URLリンク対応**: 読み取り結果がURLの場合、クリック可能なリンクとして表示
- 📝 **履歴管理**: 読み取り結果を自動保存し、重複は最新のもののみを保持
- 🔄 **カメラ切り替え**: 前面・背面カメラの切り替えが可能
- 🔐 **Google認証**: Firebaseを使用した安全な認証システム
- 💾 **クラウド同期**: Firestoreによる履歴のクラウド保存
- 📱 **レスポンシブデザイン**: モバイル・デスクトップ両対応
- 🎯 **デモモード**: Firebase設定なしでも基本機能を体験可能

### 技術スタック

- **フロントエンド**: Next.js 15 (App Router), React 19, TypeScript
- **スタイリング**: Tailwind CSS
- **QRコード読み取り**: react-zxing
- **認証・データベース**: Firebase (Authentication + Firestore)
- **デプロイ**: Vercel対応

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## セットアップ手順

### 前提条件

- Node.js 18.0 以上
- npm, yarn, pnpm, または bun
- モダンなウェブブラウザ（カメラアクセス対応）

### 1. プロジェクトのクローンと依存関係のインストール

```bash
# リポジトリをクローン
git clone https://github.com/izmktr/QrPicker.git
cd QrPicker

# 依存関係をインストール
npm install
# または
yarn install
# または
pnpm install
# または
bun install
```

### 2. Firebaseのセットアップ（オプション）

⚠️ **注意**: Firebaseの設定なしでも、デモモードでアプリケーションを体験できます。フル機能（認証・クラウド履歴保存）を使用する場合のみ、以下の設定が必要です。

このアプリケーションは、認証とデータベースのためにFirebaseを使用します。

#### 前提条件

1.  **Firebaseプロジェクトの作成:**
    *   [Firebase Console](https://console.firebase.google.com/) にアクセス
    *   「プロジェクトを追加」をクリックし、画面の指示に従ってプロジェクトを作成

2.  **必要なサービスの有効化:**
    *   作成したFirebaseプロジェクトで、「ビルド」セクションに移動
    *   **Authentication:**
        *   「Authentication」→「Sign-in method」に移動
        *   **Google** プロバイダーを有効にする
    *   **Firestore Database:**
        *   「Firestore Database」→「データベースの作成」に移動
        *   **本番環境モード**で開始
        *   データベースのロケーションを選択
        *   セキュリティルール（後述）を設定

#### 設定手順

1.  **Firebase設定情報の取得**
    *   Firebaseコンソールで、プロジェクトの「設定」（⚙️）→「プロジェクトの設定」に移動
    *   「全般」タブの「マイアプリ」で、ウェブアイコン (`</>`) をクリックして新しいウェブアプリを作成
    *   アプリにニックネームを付けて「アプリを登録」をクリック
    *   表示される `firebaseConfig` オブジェクトの内容をコピー

2.  **環境変数ファイル（.env.local）の作成**
    *   プロジェクトのルートディレクトリに `.env.local` ファイルを作成
    *   取得したFirebaseの設定値を、`NEXT_PUBLIC_` プレフィックス付きで追加:

    ```env
    # .env.local
    NEXT_PUBLIC_FIREBASE_API_KEY="your-api-key"
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
    NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project.appspot.com"
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="123456789"
    NEXT_PUBLIC_FIREBASE_APP_ID="1:123456789:web:abcdef123456"
    ```
    
    ⚠️ **重要**: 上記の値を実際のFirebaseプロジェクトの値に置き換えてください。

    💡 **ヒント**: `src/lib/firebase.ts` は、これらの環境変数を自動的に読み込みます。

    🔒 **セキュリティ**: `.env.local` ファイルは `.gitignore` に追加済みで、Gitで追跡されません。

3.  **Firestoreセキュリティルールの設定**
    *   Firebase Console → Firestore Database → ルール タブ
    *   以下のルールを設定:
    
    ```javascript
    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        // scanHistory コレクション: 認証済みユーザーのみ、自分のデータのみアクセス可能
        match /scanHistory/{document} {
          allow read, write: if request.auth != null && request.auth.uid == resource.data.userId;
          allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
        }
      }
    }
    ```

4.  **Firestoreインデックスの設定**
    *   アプリケーション初回実行時、コンソールにインデックス作成のエラーメッセージが表示される場合があります
    *   エラーメッセージ内のリンクをクリックして、Firebase Consoleで必要なインデックスを作成
    *   これは履歴機能で使用する複合クエリ（`userId` + `timestamp`）に必要です

### 3. 開発サーバーの起動

```bash
npm run dev
# または
yarn dev
# または
pnpm dev
# または
bun dev
```

🌐 ブラウザで [http://localhost:3000](http://localhost:3000) を開いてください。

### 4. 使用方法

1. **デモモード** (Firebase設定なし):
   - 基本的なQRコードスキャン機能
   - ローカル履歴保存（ブラウザセッション中のみ）

2. **フルモード** (Firebase設定あり):
   - Googleアカウントでログイン
   - QRコードスキャン
   - クラウドでの履歴保存・同期
   - デバイス間での履歴共有

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

プルリクエストや Issue の報告を歓迎します！

## 参考資料

## 参考資料

- [Next.js Documentation](https://nextjs.org/docs) - Next.js の機能とAPI
- [Learn Next.js](https://nextjs.org/learn) - インタラクティブなNext.jsチュートリアル
- [Firebase Documentation](https://firebase.google.com/docs) - Firebase の使用方法
- [react-zxing](https://www.npmjs.com/package/react-zxing) - QRコードスキャンライブラリ
- [Tailwind CSS](https://tailwindcss.com/docs) - スタイリングフレームワーク

---

⭐ このプロジェクトが役に立った場合は、GitHubでスターをお願いします！
