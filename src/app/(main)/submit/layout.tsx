import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit a Stream",
};

export default function SubmitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
