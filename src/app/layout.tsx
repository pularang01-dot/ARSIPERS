import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

export const metadata: Metadata = {
  title: { default: "ARSIPERS", template: "%s | ARSIPERS" },
  description: "Sistem informasi persuratan dan kearsipan sekolah",
  applicationName: "ARSIPERS",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "ARSIPERS", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/icon-192.png" },
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