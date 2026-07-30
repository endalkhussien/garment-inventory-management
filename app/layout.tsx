import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";

import { AuthProvider } from "@/components/providers/session-provider";
import { DEFAULT_APP_SETTINGS, getAppSettings } from "@/lib/settings";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getAppSettings();
    return {
      title: settings.companyName,
      description: `${settings.companyName} — garment manufacturing and retail`,
    };
  } catch {
    return {
      title: DEFAULT_APP_SETTINGS.companyName,
      description: "Garment manufacturing and retail management system",
    };
  }
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#5B5CE2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
