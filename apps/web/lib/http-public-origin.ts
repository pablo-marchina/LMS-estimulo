import "server-only";

export function publicApplicationOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return new URL(configured).origin;
  if (process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL_REQUIRED");
  return "http://localhost:3000";
}
