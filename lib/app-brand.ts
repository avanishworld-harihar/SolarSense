/**
 * User-visible product name. Montserrat is applied app-wide via root `font-sans` / `--font-sans`.
 */
export const APP_DISPLAY_NAME = "Sol.52";

/**
 * Bump when replacing logo or favicons so desktop browsers drop cached `/_next/image` or tab icons.
 * (Same value is appended to metadata + manifest icon URLs.)
 */
export const APP_ASSET_VERSION = "4";

/** Primary horizontal logo — PNG with transparency (`public/sol52-logo.png`). */
export const APP_LOGO_SRC = `/sol52-logo.png?v=${APP_ASSET_VERSION}`;

export const APP_TAGLINE = "Solar Intelligence. Total Support.";

export const APP_METADATA_TITLE = `${APP_DISPLAY_NAME} — Smart solar audit & proposals`;

export const APP_METADATA_DESCRIPTION =
  "Sol.52 — mobile-first solar audit, proposals, and installer workspace.";
