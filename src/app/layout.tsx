import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "AlwaysCited — The AI Search Agency",
    template: "%s | AlwaysCited",
  },
  description:
    "AlwaysCited engineers brand visibility across AI search systems — Google's AI Overview, ChatGPT, Perplexity, and other LLMs. Be the brand AI recommends.",
  metadataBase: new URL("https://alwayscited.com"),
  openGraph: {
    siteName: "AlwaysCited",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
    site: "@alwayscited",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
