import { ImageResponse } from "next/og";

/**
 * A plain picture (PNG) version of the site icon, alongside icon.svg.
 * Some places, Google among them, handle a PNG more reliably than an SVG.
 * 192 px is a multiple of 48, which is the size Google asks for.
 * Keep the shapes in step with icon.svg.
 */
export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%" }}>
        <svg width="192" height="192" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
          <rect width="64" height="64" rx="12" fill="#1d1b17" />
          {/* the cross, top to bottom */}
          <rect x="28.5" y="4" width="7" height="56" rx="1" fill="#e0b44c" />
          <rect x="14" y="16" width="36" height="7" rx="1" fill="#e0b44c" />
          {/* F on the left */}
          <rect x="12" y="33" width="4.2" height="18" fill="#f4efe6" />
          <rect x="12" y="33" width="12" height="4" fill="#f4efe6" />
          <rect x="12" y="40.5" width="9" height="3.5" fill="#f4efe6" />
          {/* G on the right */}
          <path d="M53.4 37.5 A7 7 0 1 0 55 42 L48.5 42" fill="none" stroke="#f4efe6" strokeWidth="4" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
