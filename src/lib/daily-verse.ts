import { verseList } from "@/content/verse-list";
import { chapterName, loadBible, slugify, type Book } from "@/lib/bible";
import type { DailyVerse } from "@/lib/daily-pick";

/** Looks up each "Book chapter:verse" line in our own King James text. A line that can't be found is skipped. */
export function resolveVerses(books: Book[], refs: string[]): DailyVerse[] {
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

/** The whole verse list, looked up in our own King James text, ready to pick from by day. */
export async function loadDailyVerses(): Promise<DailyVerse[]> {
  return resolveVerses(await loadBible(), verseList);
}
