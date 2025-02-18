import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Providers } from "@/components/Providers";
import "@/app/dynamic-routes";

export const dynamic = "force-dynamic";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Homeland Interiors Sales and Inventory Management Application",
  description:
    "Homeland Interiors Sales and Inventory Management Application is a web application that allows users to manage their inventory and sales of products. The application is built with Next.js, TypeScript, Tailwind CSS, and Appwrite",
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
          "min-h-screen bg-light-200 text-dark-300 font-sans antialiased",
          inter.className
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
