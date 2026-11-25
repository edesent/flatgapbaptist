import type { Metadata } from "next";
import Link from "next/link";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import VerseOfTheDay, { type DailyVerse } from "@/components/VerseOfTheDay";
import { verseList } from "@/content/verse-list";
import { chapterName, loadBible, slugify, type Book } from "@/lib/bible";

export const metadata: Metadata = {
  title: "A verse to meditate on",
  description: "A new King James Bible verse each day to read and think about, from Flat Gap Baptist Church.",
  alternates: { canonical: "/verse" },
};

/** Looks up each "Book chapter:verse" line in our own King James text. A line that can't be found is skipped. */
function resolve(books: Book[], refs: string[]): DailyVerse[] {
  return refs.flatMap((ref): DailyVerse[] => {
    const m = ref.match(/^(.+?)\s+(\d+):(\d+)(?:-(\d+))?$/);
    if (!m) return [];
    const slug = slugify(m[1]);
    const book = books.find((b) => b.slug === slug) ?? books.find((b) => b.slug.startsWith(slug));
    const chapter = book?.chapters.find((c) => c.number === Number(m[2]));
    if (!book || !chapter) return [];
    const first = Number(m[3]);
    const last = m[4] ? Number(m[4]) : first;
    const verses = chapter.verses.filter((v) => v.number >= first && v.number <= last);
    if (verses.length !== last - first + 1) return [];
    const name = chapterName(book.name);
    return [
      {
        ref: `${name} ${chapter.number}:${first}${last > first ? `–${last}` : ""}`,
        href: `/bible/${book.slug}/${chapter.number}#v${first}`,
        chapterHref: `/bible/${book.slug}/${chapter.number}`,
        chapterLabel: `${name} ${chapter.number}`,
        text: verses.map((v) => v.text).join(" "),
      },
    ];
  });
}

/** A new verse each day, taken from our own King James text. The verse is chosen in the visitor's browser by Eastern-time date, so it changes at midnight Eastern. */
export default async function VersePage() {
  const verses = resolve(await loadBible(), verseList);
  return (
    <>
      <SiteHeader />
      <section className="wrap pt-12 pb-16 md:pt-16 md:pb-24">
        <p className="kicker">God’s Word</p>
        <h1 className="mt-3 font-display text-[2.6rem] leading-[1.02] md:text-[4rem]">A verse to meditate on</h1>
        <p className="mt-6 max-w-[40rem] text-[1.1rem] leading-relaxed">
          A new verse each day. Read it slowly, and think about it through the day.
        </p>
        <VerseOfTheDay verses={verses} />
        <noscript>
          <p className="mt-8 max-w-[40rem] text-[1.1rem] leading-relaxed">
            Today’s verse needs JavaScript to appear. You can read the whole Bible on our{" "}
            <Link href="/bible" className="link">
              King James Bible
            </Link>{" "}
            pages.
          </p>
        </noscript>
      </section>
      <SiteFooter />
    </>
  );
}
