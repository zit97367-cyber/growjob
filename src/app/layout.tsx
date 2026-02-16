import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowJob - Web3 Jobs, Match Confidence, Safe Apply",
  description: "One place to discover Web3 roles, check match confidence, and apply safely.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
