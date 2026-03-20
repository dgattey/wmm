import type { Metadata } from "next";
import { AppShell } from "./components/AppShell";
import { PendingUploadProvider } from "./contexts/PendingUploadContext";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteOrigin()),
  title: {
    default: "WMM",
    template: "%s · WMM",
  },
  description: "Visualize your portfolio allocation from Fidelity exports",
  openGraph: {
    type: "website",
    siteName: "WMM",
    title: "WMM",
    description: "Visualize your portfolio allocation from Fidelity exports",
  },
  twitter: {
    card: "summary_large_image",
    title: "WMM",
    description: "Visualize your portfolio allocation from Fidelity exports",
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
        <PendingUploadProvider>
          <AppShell>{children}</AppShell>
        </PendingUploadProvider>
      </body>
    </html>
  );
}
