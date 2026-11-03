"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Item = { href: string; label: string };

/**
 * The phone menu: a button in the header that opens a list of every link.
 * Hidden on tablets and larger screens, where the regular links show instead.
 */
export default function MobileMenu({ items }: { items: Item[] }) {
  const [open, setOpen] = useState(false);

  // Escape closes the menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-11 w-11 items-center justify-center rounded-sm border border-rule text-ink hover:text-brick"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? (
            <>
              <line x1="5" y1="5" x2="19" y2="19" />
              <line x1="19" y1="5" x2="5" y2="19" />
            </>
          ) : (
            <>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </>
          )}
        </svg>
      </button>
      {open && (
        <nav
          id="mobile-menu"
          aria-label="Menu"
          className="absolute inset-x-0 top-full z-50 border-b border-rule bg-paper shadow-[0_18px_30px_-20px_rgba(29,27,23,0.45)]"
        >
          <ul className="wrap py-2">
            {items.map((n) => (
              <li key={n.href} className="border-b border-rule last:border-b-0">
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 font-sans text-[1.1rem] font-semibold text-ink hover:text-brick"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
