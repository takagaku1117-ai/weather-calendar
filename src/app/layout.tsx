import type { Metadata, Viewport } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";

const notoSansJp = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "お天気カレンダー",
  description: "都市や現在地の天気と、カレンダーで選んだ日の予報が見られる天気アプリ",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f1f5fa" },
    { media: "(prefers-color-scheme: dark)", color: "#121821" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className={`${notoSansJp.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
