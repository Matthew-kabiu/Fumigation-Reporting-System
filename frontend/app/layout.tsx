import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { ErrorBoundary } from "@/components/feedback/error-boundary";
import { AppTooltip } from "@/components/ui/app-tooltip";
import { APP_DESCRIPTION, APP_NAME, SITE_URL } from "@/lib/config/site";
import "./globals.css";

const sans = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mono",
  display: "swap",
});

const siteTitle = APP_NAME;
const siteDescription = APP_DESCRIPTION;

export const metadata: Metadata = {
  title: {
    default: siteTitle,
    template: "%s | Fumivanta",
  },
  description: siteDescription,
  applicationName: APP_NAME,
  manifest: "/manifest.webmanifest",
  ...(SITE_URL
    ? {
        metadataBase: new URL(SITE_URL),
        alternates: { canonical: "/" },
      }
    : {}),
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: siteTitle,
    description: siteDescription,
    ...(SITE_URL ? { url: SITE_URL } : {}),
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#171a16",
  colorScheme: "light",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <AppProviders>
          <ErrorBoundary>{children}</ErrorBoundary>
        </AppProviders>
        <AppTooltip />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
