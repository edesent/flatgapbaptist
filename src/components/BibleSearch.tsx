"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type Index = { books: { n: string; s: string; v: [number, number, string][] }[] };
type Hit = { ref: string; href: string; text: string };

/** The verse file is downloaded the first time it's needed, then kept for the rest of the visit. */
let indexPromise: Promise<Index> | null = null;
function loadIndex(): Promise<Index> {
  indexPromise ??= fetch("/api/bible")
    .then((r) => {
      if (!r.ok) throw new Error("download failed");
      return r.json() as Promise<Index>;
    })
    .catch((e) => {
      indexPromise = null;
      throw e;
    });
  return indexPromise;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(\d)(st|nd|rd)/, "$1");

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Short forms people type, pointing at the start of the book's full name. */
const ALIASES: Record<string, string> = {
  ge: "genesis", gen: "genesis", gn: "genesis",
  ex: "exodus", exo: "exodus", exod: "exodus",
  le: "leviticus", lev: "leviticus", lv: "leviticus",
  nu: "numbers", num: "numbers", nm: "numbers",
  de: "deuteronomy", deut: "deuteronomy", dt: "deuteronomy",
  jos: "joshua", josh: "joshua", jdg: "judges", judg: "judges", jg: "judges", ru: "ruth",
  "1sa": "1samuel", "1sam": "1samuel", "1sm": "1samuel", "2sa": "2samuel", "2sam": "2samuel", "2sm": "2samuel",
  "1ki": "1kings", "1kgs": "1kings", "1kg": "1kings", "2ki": "2kings", "2kgs": "2kings", "2kg": "2kings",
  "1ch": "1chronicles", "1chr": "1chronicles", "1chron": "1chronicles",
  "2ch": "2chronicles", "2chr": "2chronicles", "2chron": "2chronicles",
  ezr: "ezra", ne: "nehemiah", neh: "nehemiah", es: "esther", est: "esther", esth: "esther", jb: "job",
  ps: "psalms", psa: "psalms", pss: "psalms", psalm: "psalms",
  pr: "proverbs", prov: "proverbs", pro: "proverbs", prv: "proverbs",
  ec: "ecclesiastes", ecc: "ecclesiastes", eccl: "ecclesiastes", eccles: "ecclesiastes",
  so: "songof", sos: "songof", song: "songof", ss: "songof",
  isa: "isaiah", je: "jeremiah", jer: "jeremiah", la: "lamentations", lam: "lamentations",
  eze: "ezekiel", ezek: "ezekiel", da: "daniel", dan: "daniel", dn: "daniel",
  ho: "hosea", hos: "hosea", joe: "joel", jl: "joel", am: "amos", ob: "obadiah", obad: "obadiah",
  jon: "jonah", jnh: "jonah", mic: "micah", mi: "micah", na: "nahum", nah: "nahum", hab: "habakkuk",
  zep: "zephaniah", zeph: "zephaniah", hag: "haggai", zec: "zechariah", zech: "zechariah", mal: "malachi",
  mt: "matthew", mat: "matthew", matt: "matthew", mk: "mark", mr: "mark", mar: "mark",
  lk: "luke", lu: "luke", luk: "luke", jn: "john", jhn: "john", joh: "john", ac: "acts", ro: "romans", rom: "romans",
  "1co": "1corinthians", "1cor": "1corinthians", "2co": "2corinthians", "2cor": "2corinthians",
  ga: "galatians", gal: "galatians", eph: "ephesians", ephes: "ephesians", php: "philippians", phil: "philippians",
  col: "colossians", "1th": "1thessalonians", "1thess": "1thessalonians", "1thes": "1thessalonians",
  "2th": "2thessalonians", "2thess": "2thessalonians", "2thes": "2thessalonians",
  "1ti": "1timothy", "1tim": "1timothy", "2ti": "2timothy", "2tim": "2timothy",
  tit: "titus", phm: "philemon", philem: "philemon", he: "hebrews", heb: "hebrews",
  jas: "james", jam: "james", jm: "james", "1pe": "1peter", "1pet": "1peter", "1pt": "1peter",
  "2pe": "2peter", "2pet": "2peter", "2pt": "2peter", "1jn": "1john", "1jo": "1john", "1joh": "1john",
  "2jn": "2john", "2jo": "2john", "3jn": "3john", "3jo": "3john", jud: "jude",
  re: "revelation", rev: "revelation", rv: "revelation", revelations: "revelation",
};

type Book = Index["books"][number];

/** One verse or chapter of Psalms is "Psalm 23," even though the book is "Psalms." */
const single = (name: string) => (name === "Psalms" ? "Psalm" : name);

/** Finds the book a person means by "John", "Jn", "1 Cor.", "Psalm", and so on. */
function findBook(name: string, books: Book[]): Book | null {
  const n = norm(name);
  if (n.length < 2) return null;
  const target = ALIASES[n] ?? n;
  const exact = books.find((b) => norm(b.n) === target);
  if (exact) return exact;
  if (target.length < 3 && !ALIASES[n]) return null;
  return books.find((b) => norm(b.n).startsWith(target)) ?? null;
}

const REFERENCE = /^\s*((?:[1-3]\s*(?:st|nd|rd)?\s*)?[a-z][a-z.\s]*?)\s*(\d{1,3})(?:\s*[:.]\s*(\d{1,3})(?:\s*[-–]\s*(\d{1,3}))?)?\s*$/i;

/** "John 3:16", "1 Cor 13", "Ps 23:1-3" → the right chapter page. Returns null if it isn't a reference. */
function asReference(text: string, books: Book[]): { href: string } | { error: string } | null {
  const m = text.match(REFERENCE);
  if (!m) return null;
  const book = findBook(m[1], books);
  if (!book) return null;
  const chapter = Number(m[2]);
  const verse = m[3] ? Number(m[3]) : null;
  const inChapter = book.v.filter(([c]) => c === chapter);
  if (!inChapter.length) return { error: `${book.n} doesn’t have a chapter ${chapter}.` };
  if (verse !== null && !inChapter.some(([, v]) => v === verse)) return { error: `${book.n} ${chapter} doesn’t have a verse ${verse}.` };
  return { href: `/bible/${book.s}/${chapter}${verse !== null ? `#v${verse}` : ""}` };
}

/** Finds every verse containing all the words (or the exact phrase, if it is in quotes). */
function searchWords(text: string, books: Book[]): { hits: Hit[]; highlight: RegExp } | null {
  const quoted = text.match(/^["“](.+?)["”]$/);
  const terms = quoted ? [quoted[1].trim()] : text.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length || terms.every((t) => t.length < 2)) return null;
  const tests = terms.map((t) => new RegExp(`\\b${esc(t)}`, "i"));
  const hits: Hit[] = [];
  for (const b of books) {
    for (const [c, v, raw] of b.v) {
      const plain = raw.replace(/[[\]]/g, "");
      if (tests.every((re) => re.test(plain))) hits.push({ ref: `${b.n} ${c}:${v}`, href: `/bible/${b.s}/${c}#v${v}`, text: plain });
    }
  }
  return { hits, highlight: new RegExp(`\\b(${terms.map(esc).join("|")})`, "gi") };
}

function Highlighted({ text, re }: { text: string; re: RegExp }) {
  return (
    <>
      {text.split(re).map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} style={{ background: "#f3e3a3", color: "inherit" }}>
            {p}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

const PAGE = 30;

/** The Bible search box: type a verse like "John 3:16" to go straight to it, or a word like "mercy" to see every verse that has it. */
export default function BibleSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [result, setResult] = useState<{ query: string; hits: Hit[]; highlight: RegExp } | null>(null);
  const [shown, setShown] = useState(PAGE);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = q.trim().slice(0, 100);
    if (!text) return;
    setBusy(true);
    setMessage(null);
    setResult(null);
    setShown(PAGE);
    try {
      const { books } = await loadIndex();
      const ref = asReference(text, books);
      if (ref && "href" in ref) {
        router.push(ref.href);
        return;
      }
      if (ref && "error" in ref) {
        setMessage(ref.error);
        return;
      }
      const asBook = findBook(text, books);
      if (asBook && (norm(asBook.n) === (ALIASES[norm(text)] ?? norm(text)))) {
        router.push(`/bible/${asBook.s}`);
        return;
      }
      const found = searchWords(text, books);
      if (!found) {
        setMessage("Type a verse like “John 3:16,” or a word or phrase to look for.");
        return;
      }
      setResult({ query: text, ...found });
    } catch {
      setMessage("The search couldn’t load just now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-8 max-w-[40rem]">
      <form onSubmit={submit} role="search" className="flex gap-2">
        <label htmlFor="bible-search" className="sr-only">
          Search the Bible
        </label>
        <input
          id="bible-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => void loadIndex().catch(() => undefined)}
          placeholder="John 3:16, or a word like mercy"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-sm border border-rule bg-paper px-4 py-3 font-sans text-[1rem] text-ink placeholder:text-ink-soft focus:border-brick focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-sm bg-ink px-5 py-3 font-sans text-[1rem] font-semibold text-paper hover:bg-brick disabled:opacity-60"
        >
          {busy ? "Searching…" : "Search"}
        </button>
      </form>
      <p className="mt-2 font-sans text-[0.85rem] text-ink-soft">Try a verse like “Romans 8:28,” a word like “mercy,” or a phrase in quotes like “the Lord is my shepherd.”</p>

      <div aria-live="polite">
        {message && <p className="mt-5 font-sans text-[1rem] text-brick">{message}</p>}
        {result && (
          <div className="mt-6">
            <p className="font-sans font-semibold">
              {result.hits.length === 0
                ? `No verses found for “${result.query}.”`
                : `${result.hits.length.toLocaleString("en-US")} ${result.hits.length === 1 ? "verse" : "verses"} found for “${result.query}”`}
            </p>
            <ul className="mt-3">
              {result.hits.slice(0, shown).map((h) => (
                <li key={h.href} className="border-b border-rule py-3">
                  <Link href={h.href} className="link font-sans font-semibold">
                    {h.ref}
                  </Link>
                  <p className="mt-1 text-[1.05rem] leading-relaxed">
                    <Highlighted text={h.text} re={result.highlight} />
                  </p>
                </li>
              ))}
            </ul>
            {result.hits.length > shown && (
              <button
                type="button"
                onClick={() => setShown((n) => n + PAGE)}
                className="mt-5 rounded-sm border border-rule px-5 py-2.5 font-sans font-semibold hover:border-brick hover:text-brick"
              >
                Show more
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
