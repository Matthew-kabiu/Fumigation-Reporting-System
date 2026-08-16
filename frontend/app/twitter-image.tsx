import { renderSocialImage } from "@/lib/og/render";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Fumivanta — from treatment to trusted report.";

export default function TwitterImage() {
  return renderSocialImage();
}
