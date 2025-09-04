import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/context/Providers";
import { Analytics } from "@vercel/analytics/react";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title:
    "Prime Gene Biomedical Solutions Sales and Inventory Management System",
  description:
    "A Sales and Inventory Management web application that allows users to manage their inventory and sales of products. The application is built with Next.js, TypeScript, Tailwind CSS, and Appwrite",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-light-200 text-blue-800 font-sans antialiased",
          inter.className
        )}
      >
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
