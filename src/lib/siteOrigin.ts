import "server-only";

export function siteOrigin() {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return new URL(process.env.NEXT_PUBLIC_SITE_URL!).origin;
}
