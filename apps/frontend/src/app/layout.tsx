import "./globals.css";
import type { PropsWithChildren, ReactElement } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono, Syne } from "next/font/google";
import { ThemeProvider } from "@/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
});

const SITE_URL = "https://depvault.com";
const SITE_NAME = "DepVault";
const SITE_DESCRIPTION =
  "Analyze dependencies, detect vulnerabilities, and securely store environment variables across any tech stack — from package.json to .env to appsettings.json — all in one place.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "dependency analysis",
    "vulnerability detection",
    "environment variables",
    "secret management",
    "env vault",
    "dependency scanner",
    "package.json",
    "appsettings.json",
    ".env management",
    "developer tools",
    "security",
  ],
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Dependency Analysis & Environment Vault`,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: "https://ogstack.dev/api/og/45f73d525853?url=https://depvault.com&ai=true",
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} - Dependency Analysis & Environment Vault`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} - Dependency Analysis & Environment Vault`,
    description: SITE_DESCRIPTION,
    images: ["https://ogstack.dev/api/og/45f73d525853?url=https://depvault.com&ai=true"],
  },
  icons: {
    icon: { url: "/depvault-icon.svg", type: "image/svg+xml" },
    apple: "/depvault-icon.svg",
  },
  manifest: "/manifest.webmanifest",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout(props: PropsWithChildren): ReactElement {
  const { children } = props;
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${syne.variable}`}
      >
        <AppRouterCacheProvider>
          <ThemeProvider>
            <div className="vault-noise" />
            {children}
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
