import type { Metadata } from "next";
import { SiteFooter } from "./components/SiteFooter";
import { PendingUploadProvider } from "./contexts/PendingUploadContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "Your portfolio",
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
          <>
            <div className="flex min-h-dvh flex-col pb-[var(--site-footer-safe)]">
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </div>
            <SiteFooter />
          </>
        </PendingUploadProvider>
      </body>
    </html>
  );
}
