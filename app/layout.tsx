import "@/app/globals.css";

import type { Metadata, Viewport } from "next";
import { Montserrat } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
import {
  APP_ASSET_VERSION,
  APP_DISPLAY_NAME,
  APP_METADATA_DESCRIPTION,
  APP_METADATA_TITLE
} from "@/lib/app-brand";

const v = APP_ASSET_VERSION;

/** Master Plan: Montserrat app-wide (single stack via `--font-sans`). */
const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap"
});

const THEME_COLOR = "#0c5894";

function metadataBaseUrl(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    } catch {
      /* fall through */
    }
  }
  return new URL("http://localhost:3000");
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR }
  ]
};

export const metadata: Metadata = {
  metadataBase: metadataBaseUrl(),
  title: APP_METADATA_TITLE,
  description: APP_METADATA_DESCRIPTION,
  applicationName: APP_DISPLAY_NAME,
  appleWebApp: {
    capable: true,
    title: APP_DISPLAY_NAME,
    statusBarStyle: "default"
  },
  formatDetection: {
    telephone: false
  },
  icons: {
    icon: [
      { url: `/icon-192.png?v=${v}`, type: "image/png", sizes: "192x192" },
      { url: `/icon-512.png?v=${v}`, type: "image/png", sizes: "512x512" }
    ],
    apple: [{ url: `/apple-touch-icon.png?v=${v}`, type: "image/png", sizes: "180x180" }]
  },
  other: {
    "mobile-web-app-capable": "yes",
    "msapplication-TileColor": THEME_COLOR
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={montserrat.variable} suppressHydrationWarning>
      <body className="mesh-gradient-bg font-sans antialiased" suppressHydrationWarning>
        {/* Sync: mark touch devices before paint so first frame skips expensive backdrop blurs (iPad). */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var h=document.documentElement;if('ontouchstart'in window||(navigator.maxTouchPoints||0)>0||(window.matchMedia&&matchMedia('(pointer: coarse), (hover: none)').matches))h.setAttribute('data-ss-touch-optimize','');}catch(e){}"
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var hn=location.hostname||'';var isLocal=hn==='localhost'||/^127\\./.test(hn)||/^192\\.168\\./.test(hn)||/^10\\./.test(hn)||/^172\\.(1[6-9]|2\\d|3[0-1])\\./.test(hn);if(isLocal&&'serviceWorker'in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){if(!rs||!rs.length)return;return Promise.all(rs.map(function(r){return r.unregister();})).then(function(){if('caches'in window){return caches.keys().then(function(keys){return Promise.all(keys.map(function(k){return caches.delete(k);}));});}}).then(function(){var k='ss-sw-reset-v1';if(!sessionStorage.getItem(k)){sessionStorage.setItem(k,'1');location.reload();}});});}}catch(e){}"
          }}
        />
        <AppProviders>{children}</AppProviders>
        {/* Bottom tab bar portals here — `body.mesh-gradient-bg` must not use `background-attachment: fixed` (breaks iPad fixed). */}
        <div id="ss-bottom-nav-portal" className="ss-bottom-nav-portal-host lg:hidden" suppressHydrationWarning />
      </body>
    </html>
  );
}
