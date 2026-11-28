/**
 * The King James Bible text for the /bible pages.
 *
 * The text is downloaded once while the site is being built (not while visitors
 * browse), checked, and turned into ordinary pages. Visitors never touch the
 * source, and if the download or the checks fail, the build stops and the site
 * keeps showing its last good version.
 *
 * Source: the public-domain King James Version (1769 standard text) from the
 * open "bible-data" collection (github.com/midvash/bible-data).
 */
const SOURCE = "https://raw.githubusercontent.com/midvash/bible-data/v1.0.0/versions/en/kjv/kjv.json";

export type Verse = { number: number; text: string };
export type Chapter = { number: number; verses: Verse[] };
export type Book = { slug: string; name: string; testament: "OT" | "NT"; chapters: Chapter[] };

type Raw = {
  books?: {
    englishName?: string;
    testament?: string;
    chapters?: { chapter?: number; verses?: { number?: number; text?: string }[] }[];
  }[];
};

/** "1 John" becomes "1-john", "Song of Solomon" becomes "song-of-solomon". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Removes paragraph markers and stray spaces the source may carry. */
function tidy(text: string): string {
  return text.replace(/^\s*#\s*/, "").replace(/\s+/g, " ").trim();
}

let memo: Promise<Book[]> | null = null;

/** The whole Bible, loaded once per build and checked. */
export function loadBible(): Promise<Book[]> {
  memo ??= fetchAndCheck();
  return memo;
}

async function fetchAndCheck(): Promise<Book[]> {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`Bible text download failed (${res.status}).`);
  const raw = (await res.json()) as Raw;

  const books: Book[] = (raw.books ?? []).map((b) => ({
    name: b.englishName ?? "",
    slug: slugify(b.englishName ?? ""),
    testament: b.testament === "NT" ? "NT" : "OT",
    chapters: (b.chapters ?? [])
      .map((c) => ({
        number: c.chapter ?? 0,
        verses: (c.verses ?? [])
          .map((v) => ({ number: v.number ?? 0, text: tidy(v.text ?? "") }))
          .sort((x, y) => x.number - y.number),
      }))
      .sort((x, y) => x.number - y.number),
  }));

  applyCorrections(books);
  check(books);
  return books;
}

/**
 * Places where the downloaded text uses a modern word where the standard 1769
 * King James text has the older one. Each line swaps one whole word in one verse.
 * If the word isn't there (because the source was fixed), nothing changes.
 * To correct another verse, add a line: the book's web-address name, chapter, verse, the word now shown, and the word it should be.
 */
const CORRECTIONS: { book: string; chapter: number; verse: number; from: string; to: string }[] = [
  { book: "philippians", chapter: 4, verse: 4, from: "always", to: "alway" },
  { book: "matthew", chapter: 28, verse: 20, from: "always", to: "alway" },
  { book: "psalms", chapter: 9, verse: 18, from: "always", to: "alway" },
  { book: "2-corinthians", chapter: 4, verse: 11, from: "always", to: "alway" },
  { book: "colossians", chapter: 4, verse: 6, from: "always", to: "alway" },
  { book: "genesis", chapter: 28, verse: 2, from: "daughers", to: "daughters" },
  { book: "genesis", chapter: 28, verse: 6, from: "daughers", to: "daughters" },
  { book: "genesis", chapter: 47, verse: 4, from: "morever", to: "moreover" },
  { book: "deuteronomy", chapter: 7, verse: 25, from: "therin", to: "therein" },
  { book: "ezekiel", chapter: 22, verse: 21, from: "therof", to: "thereof" },
  { book: "judges", chapter: 13, verse: 19, from: "wonderously", to: "wondrously" },
  { book: "proverbs", chapter: 6, verse: 26, from: "adultress", to: "adulteress" },
  { book: "1-corinthians", chapter: 5, verse: 11, from: "idolator", to: "idolater" },
  { book: "2-kings", chapter: 8, verse: 16, from: "Je hoshaphat", to: "Jehoshaphat" },
  { book: "2-chronicles", chapter: 35, verse: 20, from: "Charchemish", to: "Carchemish" },
  { book: "genesis", chapter: 13, verse: 4, from: "make there", to: "made there" },
  { book: "exodus", chapter: 2, verse: 9, from: "And the women", to: "And the woman" },
  { book: "judges", chapter: 9, verse: 54, from: "A women", to: "A woman" },
  { book: "esther", chapter: 4, verse: 11, from: "man or women", to: "man or woman" },
  { book: "exodus", chapter: 10, verse: 14, from: "the locust went", to: "the locusts went" },
  { book: "nehemiah", chapter: 9, verse: 28, from: "in the land of", to: "in the hand of" },
  { book: "esther", chapter: 8, verse: 5, from: "I have favour", to: "I have found favour" },
  { book: "esther", chapter: 7, verse: 9, from: "who spoken", to: "who had spoken" },
  { book: "1-corinthians", chapter: 9, verse: 1, from: "Am I am not", to: "Am I not" },
  { book: "proverbs", chapter: 24, verse: 24, from: "Thou are", to: "Thou art" },
  { book: "1-john", chapter: 2, verse: 23, from: "Father: he", to: "Father: but he" },
  { book: "genesis", chapter: 27, verse: 43, from: "voice; arise", to: "voice; and arise" },
  { book: "genesis", chapter: 29, verse: 33, from: "hath heard I", to: "hath heard that I" },
  { book: "1-samuel", chapter: 10, verse: 27, from: "brought no", to: "brought him no" },
  { book: "numbers", chapter: 11, verse: 23, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 11, verse: 29, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 18, verse: 28, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 31, verse: 37, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 31, verse: 38, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 31, verse: 39, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 31, verse: 40, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 31, verse: 41, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 32, verse: 10, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 32, verse: 13, from: "Lord'S", to: "Lord's" },
  { book: "numbers", chapter: 21, verse: 28, from: "consumed ar of", to: "consumed Ar of" },
  { book: "numbers", chapter: 21, verse: 33, from: "og the king of bashan", to: "Og the king of Bashan" },
  { book: "numbers", chapter: 21, verse: 33, from: "at edrei", to: "at Edrei" },
  { book: "numbers", chapter: 23, verse: 28, from: "toward jeshimon", to: "toward Jeshimon" },
  { book: "numbers", chapter: 26, verse: 40, from: "were ard and", to: "were Ard and" },
  { book: "psalms", chapter: 70, verse: 1, from: "o God", to: "O God" },
  { book: "psalms", chapter: 79, verse: 1, from: "O god", to: "O God" },
  { book: "psalms", chapter: 88, verse: 1, from: "O lord God", to: "O Lord God" },
  { book: "psalms", chapter: 139, verse: 1, from: "O lord", to: "O Lord" },
  { book: "hosea", chapter: 14, verse: 1, from: "O israel", to: "O Israel" },
  { book: "2-corinthians", chapter: 11, verse: 32, from: "damascenes", to: "Damascenes" },
  { book: "isaiah", chapter: 2, verse: 22, from: "accounted of ?", to: "accounted of?" },
  { book: "ecclesiastes", chapter: 7, verse: 16, from: "thyself ?", to: "thyself?" },
  { book: "numbers", chapter: 15, verse: 39, from: "do them ;", to: "do them;" },
  { book: "leviticus", chapter: 25, verse: 17, from: "God:for", to: "God: for" },
  { book: "mark", chapter: 12, verse: 7, from: "ours.'", to: "ours." },
  { book: "exodus", chapter: 32, verse: 32, from: "sin--;", to: "sin\u2014;" },
];

function applyCorrections(books: Book[]): void {
  for (const c of CORRECTIONS) {
    const verse = books
      .find((b) => b.slug === c.book)
      ?.chapters.find((ch) => ch.number === c.chapter)
      ?.verses.find((v) => v.number === c.verse);
    const exact = c.from.replace(/[.*+?^${}()|[\]\\]/g, "\\    if (verse) verse.text = verse.text.replace(new RegExp(`\\b${c.from}\\b`), c.to);");
    if (verse) verse.text = verse.text.replace(new RegExp(`(?<![A-Za-z])${exact}(?![A-Za-z])`), c.to);
  }
}

/** Stops the build if the text is not the whole King James Bible. */
function check(books: Book[]): void {
  const fail = (why: string): never => {
    throw new Error(`King James Bible check failed: ${why}`);
  };
  if (books.length !== 66) fail(`expected 66 books, found ${books.length}`);
  const names = new Set(books.map((b) => b.slug));
  if (names.size !== 66 || names.has("")) fail("book names are missing or repeated");

  let chapters = 0;
  let verses = 0;
  for (const b of books) {
    chapters += b.chapters.length;
    for (const c of b.chapters) {
      verses += c.verses.length;
      if (c.verses.some((v) => !v.text)) fail(`empty verse in ${b.name} ${c.number}`);
    }
  }
  if (chapters !== 1189) fail(`expected 1,189 chapters, found ${chapters}`);
  if (verses !== 31102) fail(`expected 31,102 verses, found ${verses}`);

  // Spot checks of well-known verses, by the books' fixed order in the Bible.
  const text = (book: number, chapter: number, verse: number) =>
    books[book]?.chapters.find((c) => c.number === chapter)?.verses.find((v) => v.number === verse)?.text ?? "";
  if (!text(0, 1, 1).includes("created the heaven and the earth")) fail("Genesis 1:1 does not match");
  if (!text(18, 23, 1).includes("is my shepherd")) fail("Psalm 23:1 does not match");
  if (!text(42, 3, 16).includes("only begotten Son")) fail("John 3:16 does not match");
  if (!text(65, 22, 21).includes("Lord Jesus Christ")) fail("Revelation 22:21 does not match");
}

/** Every chapter in Bible order, for the Previous and Next buttons. */
export function allChapters(books: Book[]): { book: Book; chapter: Chapter }[] {
  return books.flatMap((book) => book.chapters.map((chapter) => ({ book, chapter })));
}

/** The book is "Psalms," but one chapter is "Psalm 23." Other books keep their name. */
export function chapterName(bookName: string): string {
  return bookName === "Psalms" ? "Psalm" : bookName;
}
