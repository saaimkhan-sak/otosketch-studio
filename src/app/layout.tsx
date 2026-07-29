import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OtoSketch Studio",
  description:
    "Surgeon-reviewed otology visuals for clinic discussions, postoperative education, and trainee walkthroughs.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
