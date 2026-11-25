import type { Book } from "@/lib/bible";

/**
 * Turns Bible references typed in an article ("John 3:16", "Rom. 8:28",
 * "1 Corinthians 13:4-7") into links to the same verse in our own King James
 * Bible. It only changes the text when it finds a real book, chapter and verse,
 * leaves anything already inside a link alone, and never edits the saved article:
 * the links are added when the page is built.
 */

// Each book's web-address name, then the ways people write it. Spaces and periods are ignored,
// so "1 Cor." and "1Cor" count as the same.
const BOOKS: [string, string[]][] = [
  ["genesis", ["genesis", "gen", "ge", "gn"]],
  ["exodus", ["exodus", "exod", "ex"]],
  ["leviticus", ["leviticus", "lev"]],
  ["numbers", ["numbers", "num"]],
  ["deuteronomy", ["deuteronomy", "deut"]],
  ["joshua", ["joshua", "josh"]],
  ["judges", ["judges", "judg"]],
  ["ruth", ["ruth"]],
  ["1-samuel", ["1samuel", "1sam"]],
  ["2-samuel", ["2samuel", "2sam"]],
  ["1-kings", ["1kings", "1kgs"]],
  ["2-kings", ["2kings", "2kgs"]],
  ["1-chronicles", ["1chronicles", "1chron", "1chr"]],
  ["2-chronicles", ["2chronicles", "2chron", "2chr"]],
  ["ezra", ["ezra"]],
  ["nehemiah", ["nehemiah", "neh"]],
  ["esther", ["esther", "esth"]],
  ["job", ["job"]],
  ["psalms", ["psalms", "psalm", "ps", "pss"]],
  ["proverbs", ["proverbs", "prov"]],
  ["ecclesiastes", ["ecclesiastes", "eccl", "eccles"]],
  ["song", ["songofsolomon", "songofsongs", "song"]],
  ["isaiah", ["isaiah", "isa"]],
  ["jeremiah", ["jeremiah", "jer"]],
  ["lamentations", ["lamentations", "lam"]],
  ["ezekiel", ["ezekiel", "ezek"]],
  ["daniel", ["daniel", "dan"]],
  ["hosea", ["hosea", "hos"]],
  ["joel", ["joel"]],
  ["amos", ["amos"]],
  ["obadiah", ["obadiah", "obad"]],
  ["jonah", ["jonah"]],
  ["micah", ["micah", "mic"]],
  ["nahum", ["nahum", "nah"]],
  ["habakkuk", ["habakkuk", "hab"]],
  ["zephaniah", ["zephaniah", "zeph"]],
  ["haggai", ["haggai", "hag"]],
  ["zechariah", ["zechariah", "zech"]],
  ["malachi", ["malachi", "mal"]],
  ["matthew", ["matthew", "matt", "mt"]],
  ["mark", ["mark", "mk"]],
  ["luke", ["luke", "lk"]],
  ["john", ["john", "jn"]],
  ["acts", ["acts"]],
  ["romans", ["romans", "rom"]],
  ["1-corinthians", ["1corinthians", "1cor"]],
  ["2-corinthians", ["2corinthians", "2cor"]],
  ["galatians", ["galatians", "gal"]],
  ["ephesians", ["ephesians", "eph"]],
  ["philippians", ["philippians", "phil"]],
  ["colossians", ["colossians", "col"]],
  ["1-thessalonians", ["1thessalonians", "1thess"]],
  ["2-thessalonians", ["2thessalonians", "2thess"]],
  ["1-timothy", ["1timothy", "1tim"]],
  ["2-timothy", ["2timothy", "2tim"]],
  ["titus", ["titus"]],
  ["philemon", ["philemon", "philem"]],
  ["hebrews", ["hebrews", "heb"]],
  ["james", ["james", "jas"]],
  ["1-peter", ["1peter", "1pet"]],
  ["2-peter", ["2peter", "2pet"]],
  ["1-john", ["1john", "1jn"]],
  ["2-john", ["2john", "2jn"]],
  ["3-john", ["3john", "3jn"]],
  ["jude", ["jude"]],
  ["revelation", ["revelation", "revelations", "rev"]],
];

const ALIAS = new Map<string, string>(BOOKS.flatMap(([slug, names]) => names.map((n) => [n, slug] as [string, string])));

// "Book chapter:verse", optionally "-verse". Spaces may be ordinary or &nbsp;. The book is a capitalised word
// (or "Song of Solomon"), with an optional 1, 2 or 3 in front.
const S = "(?:\\s|&nbsp;)+";
const REFERENCE = new RegExp(
  `(?<![A-Za-z0-9])(?:([1-3])(?:${S}|(?=[A-Z])))?([A-Z][A-Za-z]+(?:${S}of${S}[A-Z][A-Za-z]+)?)\\.?${S}(\\d{1,3}):(\\d{1,3})(?:\\s*(?:[-–—]|&ndash;|&mdash;)\\s*(\\d{1,3})(?![:\\d]))?`,
  "g",
);

/** Finds the book in our Bible text for a typed name like "1 Cor." (null if it isn't a book). */
function findBook(key: string, books: Book[]): Book | null {
  const slug = ALIAS.get(key);
  if (!slug) return null;
  return books.find((b) => b.slug === slug) ?? books.find((b) => b.slug.startsWith(slug)) ?? null;
}

/** Adds a link to every real Bible reference in the article's text. Existing links and tags are left alone. */
export function linkBibleReferences(html: string, books: Book[]): string {
  let insideLink = 0;
  return html
    .split(/(<[^>]*>)/)
    .map((part) => {
      if (part.startsWith("<")) {
        if (/^<a[\s>]/i.test(part)) insideLink++;
        else if (/^<\/a\s*>/i.test(part)) insideLink = Math.max(0, insideLink - 1);
        return part;
      }
      if (insideLink) return part;
      return part.replace(REFERENCE, (whole, num: string | undefined, name: string, chapter: string, first: string, last: string | undefined) => {
        const key = `${num ?? ""}${name}`.toLowerCase().replace(/[^a-z0-9]/g, "");
        const book = findBook(key, books);
        if (!book) return whole;
        const verses = book.chapters.find((c) => c.number === Number(chapter))?.verses;
        if (!verses?.some((v) => v.number === Number(first))) return whole;
        if (last && !verses.some((v) => v.number === Number(last))) return whole;
        return `<a href="/bible/${book.slug}/${Number(chapter)}#v${Number(first)}">${whole}</a>`;
      });
    })
    .join("");
}
