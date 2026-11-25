import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import VerseText from "@/components/VerseText";
import { allChapters, chapterName, loadBible } from "@/lib/bible";

// Only the 1,189 real chapters exist; anything else is a "not found" page.
export const dynamicParams = false;

export async function generateStaticParams() {
  return allChapters(await loadBible()).map(({ book, chapter }) => ({ book: book.slug, chapter: String(chapter.number) }));
}

type Params = Promise<{ book: string; chapter: string }>;

async function find(params: Params) {
  const { book, chapter } = await params;
  const books = await loadBible();
  const all = allChapters(books);
  const i = all.findIndex((x) => x.book.slug === book && String(x.chapter.number) === chapter);
  return i < 0 ? null : { here: all[i], prev: all[i - 1] ?? null, next: all[i + 1] ?? null };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const found = await find(params);
  if (!found) return {};
  const { book, chapter } = found.here;
  const first = chapter.verses[0]?.text.replace(/[[\]]/g, "") ?? "";
  return {
    title: `${chapterName(book.name)} ${chapter.number}, King James Bible`,
    description: `${chapterName(book.name)} ${chapter.number} in the King James Bible. ${first.slice(0, 120)}`,
    alternates: { canonical: `/bible/${book.slug}/${chapter.number}` },
  };
}

/** One chapter of the Bible, with Previous and Next buttons. Each verse has its own link target, so /bible/john/3#v16 jumps to John 3:16. */
export default async function ChapterPage({ params }: { params: Params }) {
  const found = await find(params);
  if (!found) notFound();
  const { here, prev, next } = found;
  const { book, chapter } = here;

  const step = (target: typeof prev, label: string, side: "left" | "right") =>
    target ? (
      <Link
        href={`/bible/${target.book.slug}/${target.chapter.number}`}
        className={`link font-sans font-semibold ${side === "right" ? "text-right" : ""}`}
      >
        {side === "left" ? "← " : ""}
        {label}: {target.book.name} {target.chapter.number}
        {side === "right" ? " →" : ""}
      </Link>
    ) : (
      <span />
    );

  return (
    <>
      <SiteHeader />
      <section className="wrap pt-10 pb-16 md:pt-14 md:pb-24">
        <p className="kicker">
          <Link href="/bible" className="hover:text-brick">
            King James Bible
          </Link>
          {" · "}
          <Link href={`/bible/${book.slug}`} className="hover:text-brick">
            {book.name}
          </Link>
        </p>
        <h1 className="mt-3 font-display text-[2.4rem] leading-[1.02] md:text-[3.4rem]">
          {chapterName(book.name)} {chapter.number}

        <div className="mt-8 max-w-[40rem]">
          {chapter.verses.map((v) => (
            <p key={v.number} id={`v${v.number}`} className="scroll-mt-6 py-1 text-[1.2rem] leading-[1.75] target:bg-paper-deep md:text-[1.3rem]">
              <sup className="mr-1.5 font-sans text-[0.7rem] font-bold text-brick">{v.number}</sup>
              <VerseText text={v.text} />
            </p>
          ))}
        </div>

        <nav aria-label="Chapters" className="mt-12 flex max-w-[40rem] items-center justify-between gap-4 border-t border-rule pt-6">
          {step(prev, "Previous", "left")}
          {step(next, "Next", "right")}
        </nav>
        <p className="mt-8 font-sans text-[0.85rem] text-ink-soft">
          <Link href={`/bible/${book.slug}`} className="link">
            All chapters of {book.name}
          </Link>
        </p>
      </section>
      <SiteFooter />
    </>
  );
}
