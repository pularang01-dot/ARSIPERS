import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "ARSIPERS", template: "%s | ARSIPERS" },
  description: "Sistem informasi persuratan dan kearsipan sekolah",
  applicationName: "ARSIPERS",
  authors: [{ name: "Viky Aditama" }],
  creator: "Viky Aditama",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ARSIPERS", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#0F1F3D", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className="font-sans">
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}