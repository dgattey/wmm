import type { Metadata } from "next";
import { AppShell } from "./components/AppShell";
import { PendingUploadProvider } from "./contexts/PendingUploadContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "WMM",
    template: "%s · WMM",
  },
  description: "Visualize your portfolio allocation from Fidelity exports",
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
