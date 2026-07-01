import type { Metadata } from "next";
import { Fraunces } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";

import "./globals.css";

// Warm editorial serif for the marketing display type ("grounded precision").
// Only used on the landing page; the app keeps Geist.
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  axes: ["opsz", "SOFT"],
  style: ["normal", "italic"],
  display: "swap",
});

import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

export const metadata: Metadata = {
  title: {
    default: "Furrow",
    template: "%s · Furrow",
  },
  description:
    "Market intelligence for row-crop farmers — a precision instrument for the farm's money and market decisions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable} ${fraunces.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <TooltipProvider delayDuration={120}>{children}</TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
