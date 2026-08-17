import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://otosketch-studio.vercel.app"),
  title: "OtoSketch Studio",
  description:
    "Surgeon-reviewed otology visuals for clinic discussions, postoperative education, and trainee walkthroughs.",
  openGraph: {
    title: "OtoSketch Studio",
    description:
      "Structured, surgeon-reviewed otology diagrams for clinic, postoperative education, and teaching.",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OtoSketch Studio",
    description:
      "Structured, surgeon-reviewed otology diagrams for clinic, postoperative education, and teaching.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
