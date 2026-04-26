import type { MetadataRoute } from "next";

import {
  APP_ASSET_VERSION,
  APP_DISPLAY_NAME,
  APP_METADATA_DESCRIPTION,
  APP_METADATA_TITLE
} from "@/lib/app-brand";

const THEME = "#0c5894";
const BG = "#f4f7fb";

/** Served at /manifest.webmanifest — avoids static JSON drift vs Next metadata. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: APP_METADATA_TITLE,
    short_name: APP_DISPLAY_NAME,
    description: APP_METADATA_DESCRIPTION,
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "browser"],
    orientation: "portrait-primary",
    background_color: BG,
    theme_color: THEME,
    categories: ["business", "productivity", "utilities"],
    icons: [
      { src: `/icon-192.png?v=${APP_ASSET_VERSION}`, type: "image/png", sizes: "192x192", purpose: "any" },
      { src: `/icon-512.png?v=${APP_ASSET_VERSION}`, type: "image/png", sizes: "512x512", purpose: "any" },
      {
        src: `/icon-512.png?v=${APP_ASSET_VERSION}`,
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable"
      }
    ]
  };
}
