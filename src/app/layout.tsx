import type { Metadata } from "next";
import "@fontsource-variable/hanken-grotesk";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: {
    default: "alwayscited - Be the brand AI recommends",
    template: "%s | alwayscited",
  },
  description:
    "alwayscited places your brand inside the pages Google and AI systems already trust - so you rank higher, get cited more often, and win buyers before they reach your competitors.",
  metadataBase: new URL("https://alwayscited.com"),
  openGraph: {
    siteName: "alwayscited",
    type: "website",
    locale: "en_GB",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className="h-full">
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
