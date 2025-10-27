import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PreorderBanner } from "@/components/PreorderBanner";
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
  title: {
    default: "FoxesGear – Stratford Foxes Official Shop",
    template: "%s · FoxesGear",
  },
  description: "Premium Stratford Foxes apparel. Simple pre-order storefront with secure Stripe checkout.",
  metadataBase: new URL("https://foxesgear.com"),
  openGraph: {
    title: "FoxesGear – Stratford Foxes Official Shop",
    description: "Premium Stratford Foxes apparel. Simple pre-order storefront with secure Stripe checkout.",
    url: "https://foxesgear.com",
    siteName: "FoxesGear",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FoxesGear – Stratford Foxes Official Shop",
    description: "Premium Stratford Foxes apparel. Simple pre-order storefront with secure Stripe checkout.",
  },
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground font-sans`}
      >
        <div className="relative flex min-h-dvh flex-col">
          {/* Preorder banner */}
          <PreorderBanner />
          <Header />
          <main className="flex-1">
            <div className="container py-8 sm:py-10 md:py-12">
              {children}
            </div>
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
