import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./styles/ledger.css";
import "./styles/themes.css";
import Script from 'next/script';
import PwaRuntime from './components/PwaRuntime';
import ThemeRuntime from './components/ThemeRuntime';
import { ConfirmHost } from './components/ConfirmDialog';
import { themeInitScript } from './lib/theme';

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
  themeColor: "#0b5cad",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Script id="app-theme" strategy="beforeInteractive">{themeInitScript}</Script>
        <ThemeRuntime /><PwaRuntime />{children}<ConfirmHost />
      </body>
    </html>
  );
}
