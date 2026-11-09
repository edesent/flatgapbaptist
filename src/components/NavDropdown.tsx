"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/**
 * A header link that opens a small list of pages under it ("About").
 * Opens on hover or click, closes on Escape, a click elsewhere, or picking a link.
 */
export default function NavDropdown({
  label,
  short,
  items,
}: {
  label: string;
  short: string;
  items: { href: string; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  return (
    <div ref={box} className="relative" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 hover:text-brick"
      >
        <span className="lg:hidden">{short}</span>
        <span className="hidden lg:inline">{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="2,3.5 5,6.5 8,3.5" />
        </svg>
      </button>
      {open && (
        <ul className="absolute right-0 top-full z-50 min-w-[12rem] pt-2">
          <div className="border border-rule bg-paper py-1 shadow-[0_14px_28px_-18px_rgba(29,27,23,0.5)]">
            {items.map((i) => (
              <li key={i.href} className="list-none">
                <Link href={i.href} onClick={() => setOpen(false)} className="block whitespace-nowrap px-4 py-2.5 hover:bg-paper-deep hover:text-brick">
                  {i.label}
                </Link>
              </li>
            ))}
          </div>
        </ul>
      )}
    </div>
  );
}
