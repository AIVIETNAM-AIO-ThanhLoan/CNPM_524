import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/ledger.css";
import PwaRuntime from './components/PwaRuntime';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ting Ting",
  description: "Quản lý thu chi cá nhân",
  applicationName: "Ting Ting",
  appleWebApp: {
    capable: true,
    title: "Ting Ting",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#7a0c2e",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col"><PwaRuntime />{children}</body>
    </html>
  );
}
