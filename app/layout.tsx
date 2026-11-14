import type { Metadata } from "next";
import { Public_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const publicSans = Public_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: "Relay",
  description: "Turn approved context into an intention, find public ways forward, and meet members who could help.",
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
