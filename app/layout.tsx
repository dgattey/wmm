import type { Metadata } from "next";
import { AppShell } from "./components/AppShell";
import "./globals.css";

function siteOrigin(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/^https?:\/\//, "")}`;
  }
  return "http://localhost:3000";
}

const siteDescription =
  "What you own, where it sits, and how it all fits together.";

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "WMM",
    template: "%s · WMM",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    siteName: "WMM",
    title: "WMM",
    description: siteDescription,
  },
  twitter: {
    card: "summary_large_image",
    title: "WMM",
    description: siteDescription,
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
