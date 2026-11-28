import { inflateRawSync } from "node:zlib";
import { loadBible } from "@/lib/bible";

// Temporary helper for the hidden text-check pages. Not a page itself.
export const BASE = "k-0a913dbad6c28e36b7cbced2805298f3";
const SECOND = "https://ebible.org/Scriptures/eng-kjv2006_vpl.zip";

export const PARTS = [
  { slug: "law", title: "The Law (Genesis to Deuteronomy)", from: 0, to: 4 },
  { slug: "history", title: "History (Joshua to Esther)", from: 5, to: 16 },
  { slug: "poetry", title: "Poetry (Job to Song of Solomon)", from: 17, to: 21 },
  { slug: "prophets", title: "Prophets (Isaiah to Malachi)", from: 22, to: 38 },
  { slug: "gospels", title: "Gospels and Acts (Matthew to Acts)", from: 39, to: 43 },
  { slug: "epistles", title: "Epistles and Revelation (Romans to Revelation)", from: 44, to: 65 },
];

export type Diff = { ref: string; oursBit: string; theirsBit: string };
export type PartResult = { slug: string; title: string; compared: number; same: number; nameCaseOnly: number; diffs: Diff[] };
export type Result = { lines: number; codes: number; missingInTheirs: string[]; missingInOurs: number; parts: PartResult[] };

/** Reads the largest .txt file out of a zip file, with no extra tools needed. */
function readZipText(buf: Buffer): string {
  let end = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("the zip file's directory was not found");
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  let best: { local: number; csize: number; method: number; size: number } | null = null;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("the zip file's directory could not be read");
    const method = buf.readUInt16LE(p + 10);
    const csize = buf.readUInt32LE(p + 20);
    const size = buf.readUInt32LE(p + 24);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (/\.txt$/i.test(name) && (!best || size > best.size)) best = { local, csize, method, size };
  }
  if (!best) throw new Error("no text file was found inside the zip file");
  const start = best.local + 30 + buf.readUInt16LE(best.local + 26) + buf.readUInt16LE(best.local + 28);
  const data = buf.subarray(start, start + best.csize);
  return (best.method === 0 ? data : inflateRawSync(data)).toString("utf8");
}

function norm(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[¶#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Their text: drop reference numbers and tags, and drop the square brackets that mark italic words. */
function cleanTheirs(s: string): string {
  return norm(
    s
      .replace(/\{[^}]*\}/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\[(?:[HG])?\d+\]/g, " ")
      .replace(/[\[\]]/g, "")
  );
}

/** LORD, GOD and JEHOVAH in capitals become Lord, God and Jehovah, so that capital-letter-only differences can be set aside. */
function softenNames(s: string): string {
  return s.replace(/\bLORD\b/g, "Lord").replace(/\bGOD\b/g, "God").replace(/\bJEHOVAH\b/g, "Jehovah");
}

function bits(a: string, b: string): { oursBit: string; theirsBit: string } {
  const x = a.split(" ");
  const y = b.split(" ");
  let s = 0;
  while (s < x.length && s < y.length && x[s] === y[s]) s++;
  let e = 0;
  while (e < x.length - s && e < y.length - s && x[x.length - 1 - e] === y[y.length - 1 - e]) e++;
  const ctx = (w: string[]) => w.slice(Math.max(0, s - 2), w.length - e + 1).join(" ");
  return { oursBit: ctx(x), theirsBit: ctx(y) };
}

async function run(): Promise<Result> {
  const books = await loadBible();
  const res = await fetch(SECOND);
  if (!res.ok) throw new Error(`the second text could not be downloaded (${res.status})`);
  const text = readZipText(Buffer.from(await res.arrayBuffer()));

  const codeOrder: string[] = [];
  const theirs = new Map<string, string>();
  let lines = 0;
  for (const line of text.split(/\r?\n/)) {
    const m = /^([1-3A-Z][A-Z0-9]{2})\s+(\d+):(\d+)\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    lines++;
    let idx = codeOrder.indexOf(m[1]);
    if (idx < 0) {
      codeOrder.push(m[1]);
      idx = codeOrder.length - 1;
    }
    theirs.set(`${idx}|${Number(m[2])}|${Number(m[3])}`, cleanTheirs(m[4]));
  }

  const used = new Set<string>();
  const missingInTheirs: string[] = [];
  const parts: PartResult[] = PARTS.map((p) => ({ slug: p.slug, title: p.title, compared: 0, same: 0, nameCaseOnly: 0, diffs: [] }));
  books.forEach((b, bi) => {
    const pi = PARTS.findIndex((p) => bi >= p.from && bi <= p.to);
    if (pi < 0) return;
    const part = parts[pi];
    for (const c of b.chapters) {
      for (const v of c.verses) {
        const key = `${bi}|${c.number}|${v.number}`;
        const ref = `${b.name} ${c.number}:${v.number}`;
        const t = theirs.get(key);
        if (t === undefined) {
          missingInTheirs.push(ref);
          continue;
        }
        used.add(key);
        part.compared++;
        const o = norm(v.text);
        if (o === t) {
          part.same++;
          continue;
        }
        const t2 = softenNames(t);
        if (o === t2) {
          part.nameCaseOnly++;
          continue;
        }
        part.diffs.push({ ref, ...bits(o, t2) });
      }
    }
  });
  const missingInOurs = [...theirs.keys()].filter((k) => !used.has(k)).length;
  return { lines, codes: codeOrder.length, missingInTheirs, missingInOurs, parts };
}

let memo: Promise<Result> | null = null;
export function getComparison(): Promise<Result> {
  memo ??= run();
  return memo;
}
