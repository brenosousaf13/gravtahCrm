import type { Metadata } from "next";
import { Inter_Tight } from "next/font/google"; // Fallback to Inter if issues arise
import "./globals.css";

const interTight = Inter_Tight({
  variable: "--font-inter-tight",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL('https://crm.gravtah.com.br'),
  title: "Gravtah - Atendimento ao Cliente",
  description: "Official Warranty Portal for Gravtah",
};

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${interTight.variable} antialiased`}>
        {children}
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
