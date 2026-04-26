/** Public installer name for WhatsApp / copy. Set `NEXT_PUBLIC_INSTALLER_BRAND` in `.env.local`. */
export function getInstallerBrandName(): string {
  const v = process.env.NEXT_PUBLIC_INSTALLER_BRAND?.trim();
  return v && v.length > 0 ? v : "Harihar Solar";
}
