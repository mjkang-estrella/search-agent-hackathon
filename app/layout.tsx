import type { Metadata, Viewport } from "next";
import { Public_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL
      ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000"),
  ),
  title: "Relay",
  applicationName: "Relay",
  description: "Turn what your AI remembers into intentions, and find people and places that can help.",
  appleWebApp: { capable: true, title: "Relay", statusBarStyle: "default" },
  openGraph: {
    title: "Relay",
    siteName: "Relay",
    description: "Turn what your AI remembers into intentions, and find people and places that can help.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Relay" },
};

export const viewport: Viewport = {
  themeColor: "#e0d6f5",
  colorScheme: "light",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
