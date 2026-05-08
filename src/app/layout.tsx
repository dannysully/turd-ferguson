import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "AlwaysCited — Be the brand AI recommends",
    template: "%s | AlwaysCited",
  },
  description:
    "AlwaysCited places your brand inside the pages Google and AI systems already trust — so you rank higher, get cited more often, and win buyers before they reach your competitors.",
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
    <html lang="en" className={`${manrope.variable} h-full`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
