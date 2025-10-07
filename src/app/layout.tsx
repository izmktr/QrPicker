import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ClientAuthProvider } from "@/components/ClientAuthProvider";
import { PWAInstaller } from "@/components/PWAInstaller";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "QuickPick", // titleとdescriptionは残します
  description: "QRコードを読み取り、履歴を管理できるモダンなウェブアプリケーション",
  manifest: "/manifest.json",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
  // appleWebAppとiconsはmanifest.jsonと重複するため、Next.jsのメタデータ機能に任せます
  icons: {
    icon: "/icon-192x192.svg",
    apple: "/icon-192x192.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWAInstaller />
        <ClientAuthProvider>{children}</ClientAuthProvider>
      </body>
    </html>
  );
}
