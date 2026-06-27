import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Organizer",
  description: "A private organizer for family life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="theme-warmth-order bg-background text-on-background min-h-screen">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}