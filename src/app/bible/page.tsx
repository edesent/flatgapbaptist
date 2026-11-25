import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import BibleSearch from "@/components/BibleSearch";
import SiteHeader from "@/components/SiteHeader";
import { loadBible, type Book } from "@/lib/bible";

export const metadata: Metadata = {
  title: "King James Bible",
  description: "Read the whole King James Bible online, book by book and chapter by chapter, from Flat Gap Baptist Church.",
  alternates: { canonical: "/bible" },
};

function BookList({ title, books }: { title: string; books: Book[] }) {
  return (
    <div className="mt-12">
      <h2 className="font-display text-[1.8rem] md:text-[2.2rem]">{title}</h2>
      {/* Columns run top to bottom, then start the next column. */}
      <ul className="mt-4 columns-2 gap-x-6 sm:columns-3 lg:columns-4">
        {books.map((b) => (
          <li key={b.slug} className="break-inside-avoid border-b border-rule">
            <Link href={`/bible/${b.slug}`} className="block py-2.5 font-sans font-semibold hover:text-brick">
              {b.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The King James Bible: search box and the list of all 66 books. */
export default async function BiblePage() {
  const books = await loadBible();
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">God’s Word</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">King James Bible</h1>
        <p className="mt-6 max-w-[40rem] text-[1.1rem] leading-relaxed">Search for a verse or a word, or choose a book and a chapter to read.</p>
        <BibleSearch />
        <BookList title="Old Testament" books={books.filter((b) => b.testament === "OT")} />
        <BookList title="New Testament" books={books.filter((b) => b.testament === "NT")} />
        <p className="mt-14 max-w-[40rem] font-sans text-[0.85rem] leading-snug text-ink-soft">
          The King James Version, using the standard 1769 text. This Bible is in the public domain.
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
