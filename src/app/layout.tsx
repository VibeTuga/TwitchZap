import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "TwitchZap — Community-Powered Stream Discovery",
  description:
    "Discover new Twitch streams together. Vote to skip or extend. Earn Zap Points.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full antialiased">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full bg-background text-on-surface font-body">
        <Sidebar />
        <TopBar />
        <main className="lg:ml-64 p-8 min-h-screen pb-24 lg:pb-8">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
        <MobileNav />
        <Toaster />
      </body>
    </html>
  );
}
