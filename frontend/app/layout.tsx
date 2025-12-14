import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Microblog",
  description: "ActivityPub microblog",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Microblog",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <link rel="stylesheet" href="/assets/prism-tomorrow.css" />
        <link rel="stylesheet" href="/assets/katex.min.css" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} dark bg-background text-foreground font-sans leading-relaxed antialiased`}
      >
        {children}
        <Script src="/assets/prism-bundle.min.js" strategy="beforeInteractive" />
        <Script src="/assets/katex.min.js" strategy="beforeInteractive" />
        <Script src="/assets/auto-render.min.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
