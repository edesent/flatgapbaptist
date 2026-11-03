"use client";

import { useCallback, useEffect, useState } from "react";
import type { GalleryPhoto } from "@/content/gallery";

/**
 * A responsive photo grid with a click-to-enlarge lightbox (prev/next,
 * Escape to close, arrow keys to move). No external dependencies — just a
 * fixed overlay, matching the site's plain, fast-loading style.
 */
export default function PhotoGallery({ photos }: { photos: GalleryPhoto[] }) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  const close = useCallback(() => setOpenAt(null), []);
  const prev = useCallback(() => setOpenAt((i) => (i === null ? null : (i - 1 + photos.length) % photos.length)), [photos.length]);
  const next = useCallback(() => setOpenAt((i) => (i === null ? null : (i + 1) % photos.length)), [photos.length]);

  useEffect(() => {
    if (openAt === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [openAt, close, prev, next]);

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
        {photos.map((p, i) => (
          <button
            key={p.file}
            type="button"
            onClick={() => setOpenAt(i)}
            className="group aspect-square overflow-hidden rounded-sm border border-rule bg-paper-deep"
            aria-label={`View photo: ${p.alt}`}
          >
            <img
              src={`/gallery/${p.file}`}
              alt={p.alt}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {openAt !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-4 sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={photos[openAt].alt}
          onClick={close}
        >
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 font-sans text-[1rem] font-bold text-paper/90 hover:text-paper sm:right-6 sm:top-6"
          >
            Close ✕
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous photo"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-paper/10 px-3 py-2 font-sans text-[1.4rem] text-paper hover:bg-paper/20 sm:left-6"
          >
            ‹
          </button>

          <img
            src={`/gallery/${photos[openAt].file}`}
            alt={photos[openAt].alt}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-full rounded-sm object-contain shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)]"
          />

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next photo"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-paper/10 px-3 py-2 font-sans text-[1.4rem] text-paper hover:bg-paper/20 sm:right-6"
          >
            ›
          </button>

          <p className="absolute bottom-4 left-1/2 w-full max-w-[90%] -translate-x-1/2 text-center font-sans text-[0.9rem] text-paper/80">
            {photos[openAt].alt} · {openAt + 1} of {photos.length}
          </p>
        </div>
      )}
    </>
  );
}
