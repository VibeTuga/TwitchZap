import type { Metadata } from "next";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TwitchZap — Community-Powered Stream Discovery",
    template: "%s | TwitchZap",
  },
  description:
    "Watch, vote, and discover live Twitch streams together. One stream plays at a time, and the community decides what happens next.",
  openGraph: {
    title: "TwitchZap — Community-Powered Stream Discovery",
    description:
      "Watch, vote, and discover live Twitch streams together. One stream plays at a time, and the community decides what happens next.",
    type: "website",
    url: process.env.NEXT_PUBLIC_APP_URL ?? "https://twitchzap.com",
    siteName: "TwitchZap",
  },
  twitter: {
    card: "summary_large_image",
    title: "TwitchZap — Community-Powered Stream Discovery",
    description:
      "Watch, vote, and discover live Twitch streams together. One stream plays at a time, and the community decides what happens next.",
  },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "https://twitchzap.com"
  ),
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
        <main className="lg:ml-64 px-4 md:px-8 pt-4 md:pt-8 pb-24 lg:pb-8 min-h-screen">
          <div className="max-w-[1600px] mx-auto">{children}</div>
        </main>
        <MobileNav />
        <Toaster />
      </body>
    </html>
  );
}
