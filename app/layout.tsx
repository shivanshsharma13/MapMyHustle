import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Strava Territories Map",
  description: "Fetch your Strava runs & rides, draw coverage hexes, and see area stats.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
