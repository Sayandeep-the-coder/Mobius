import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import "./near-bundle.css";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-figtree",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mobius — Rehearse the risk before it happens",
  description:
    "Mobius is a read-only risk rehearsal tool for leveraged DeFi positions on Monad. Stress-test shocks, compare your next move, and keep a verifiable receipt. No keys. No custody.",
  openGraph: {
    title: "Mobius — Your leveraged position, rehearsed",
    description:
      "Paste a public address. See how far you are from liquidation, what a rate spike does to your yield, and what to do next.",
    siteName: "Mobius",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mobius — Rehearse the risk before it happens",
    description:
      "Mobius is a read-only risk rehearsal tool for leveraged DeFi positions on Monad. Stress-test shocks, compare your next move, and keep a verifiable receipt. No keys. No custody.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${figtree.variable} scroll-smooth`}>
      <body className="min-h-screen bg-white text-neutral-900 antialiased selection:bg-[#836EF9] selection:text-white">
        {children}
      </body>
    </html>
  );
}
