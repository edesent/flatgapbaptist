import { ImageResponse } from "next/og";

/**
 * A plain picture (PNG) version of the site icon, alongside icon.svg.
 * Some places, Google among them, handle a PNG more reliably than an SVG.
 * 192 px is a multiple of 48, which is the size Google asks for.
 */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg width="192" height="192" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#1d1b17" />
          {/* the cross */}
          <rect x="29" y="5" width="6" height="23" rx="1" fill="#e0b44c" />
          <rect x="22" y="11" width="20" height="6" rx="1" fill="#e0b44c" />
          {/* F */}
          <rect x="12" y="35" width="5" height="21" fill="#f4efe6" />
          <rect x="12" y="35" width="14" height="4.5" fill="#f4efe6" />
          <rect x="12" y="43" width="10" height="4" fill="#f4efe6" />
          {/* G */}
          <path d="M49.7 39.6 A10 10 0 1 0 52 46 L43.5 46" fill="none" stroke="#f4efe6" strokeWidth="4.5" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
