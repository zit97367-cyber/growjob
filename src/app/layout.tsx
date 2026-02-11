import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GrowJob",
  description: "Web3 jobs with ATS verification and weekly apply limits",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <main className="page-stage">
          <div className="phone-grid">{children}</div>
        </main>
      </body>
    </html>
  );
}
