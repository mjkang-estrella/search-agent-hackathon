import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { ConvexClientProvider } from "./ConvexClientProvider";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Search Agent",
  description: "Your intentions, saved by your AI assistant. Review, edit, and choose what to share.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ConvexClientProvider>
          <header className="border-b border-border bg-surface">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
              <Link href="/" className="font-semibold tracking-tight">
                Search Agent
              </Link>
              <span className="text-sm text-muted">Demo user · no sign-in</span>
            </div>
          </header>
          <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
