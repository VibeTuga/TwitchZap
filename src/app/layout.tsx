import type { Metadata } from "next";
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
      <body className="min-h-full flex flex-col bg-background text-on-surface font-body">
        {children}
      </body>
    </html>
  );
}
