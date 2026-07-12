import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

import AppGuard from "@/components/AppGuard";

export const metadata: Metadata = {
  title: "BucketBackup | Enterprise Cloud Recovery",
  description: "Secure, scalable, and intelligent multi-cloud backup platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`}>
      <body className="bg-[#0a0a0a] text-zinc-400 font-sans">
        <AppGuard>
          {children}
        </AppGuard>
      </body>
    </html>
  );
}
