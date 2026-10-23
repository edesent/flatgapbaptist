"use client";

import { useEffect } from "react";

/**
 * Fades in every [data-reveal] element as it scrolls into view. Mounted once
 * in the layout, so it also watches for pages that arrive through client-side
 * navigation (a MutationObserver re-scans), and the shown state is a
 * `data-in` attribute rather than a class, because React rewrites className
 * when it reuses a node between pages. Content is visible without JavaScript.
 */
export default function Reveal() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.transitionDelay = `${Number(el.dataset.reveal || 0) * 90}ms`;
          el.setAttribute("data-in", "");
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    const scan = () =>
      document
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-in]):not([data-seen])")
        .forEach((el) => {
          el.setAttribute("data-seen", "");
          io.observe(el);
        });
    scan();
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      mo.disconnect();
      io.disconnect();
    };
  }, []);
  return null;
}
