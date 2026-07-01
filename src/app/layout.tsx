import type { Metadata } from "next";
import { QueryProvider } from "@/components/providers/QueryProvider";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Family Organizer",
  description: "A private organizer for family life.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-foreground min-h-screen">
        <QueryProvider>{children}</QueryProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}