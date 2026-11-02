import Link from "next/link";
import { nav } from "@/lib/site";

/** The top bar on every page: the church's name home, and the links in site.ts. */
export default function SiteHeader() {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="wrap flex items-center justify-between gap-4 py-3">
        <Link href="/" className="shrink-0 font-display text-[1.15rem] leading-tight tracking-wide text-ink sm:text-[1.3rem]">
          Flat Gap Baptist
        </Link>
        <nav aria-label="Site" className="flex items-center gap-4 font-sans text-[0.92rem] font-semibold sm:gap-5 lg:gap-6 lg:text-[0.95rem]">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={`hover:text-brick ${n.phone ? "" : "hidden md:inline"}`}>
              <span className="lg:hidden">{n.short}</span>
              <span className="hidden lg:inline">{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
