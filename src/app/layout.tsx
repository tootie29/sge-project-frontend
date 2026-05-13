import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AdminShell } from "@/components/admin-shell";
import { Toaster } from "@/components/ui/sonner";

const interSans = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SGE CRM — Enterprise Node",
  description: "Admin dashboard for SGE CRM",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${interSans.variable} ${jetMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <AdminShell>{children}</AdminShell>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
