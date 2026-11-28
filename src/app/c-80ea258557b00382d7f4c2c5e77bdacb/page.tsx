import type { Metadata } from "next";
import { inflateRawSync } from "node:zlib";
import { loadBible } from "@/lib/bible";

// Temporary page: compares our King James text with the eBible.org King James text.
// It has no menu link, is not in the sitemap, and tells search engines to skip it.
// It is built to never stop the site from building: any problem shows as a message.
export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Text check",
  robots: { index: false, follow: false, nocache: true },
};

const SECOND = "https://ebible.org/Scriptures/eng-kjv2006_vpl.zip";

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

/** Evens out spacing, paragraph marks and curly quotes so only real wording differences show. */
function norm(s: string): string {
  return s
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[¶#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Removes reference numbers (Strong's numbers) and tags from the second text. */
function cleanTheirs(s: string): string {
  return norm(
    s
      .replace(/\{[^}]*\}/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\[(?:[HG])?\d+\]/g, " ")
  );
}

type Diff = { ref: string; ours: string; theirs: string; oursBit: string; theirsBit: string };

/** Finds the stretch of words that differs, ignoring the matching start and end. */
function bits(a: string, b: string): { oursBit: string; theirsBit: string } {
  const x = a.split(" ");
  const y = b.split(" ");
  let s = 0;
  while (s < x.length && s < y.length && x[s] === y[s]) s++;
  let e = 0;
  while (e < x.length - s && e < y.length - s && x[x.length - 1 - e] === y[y.length - 1 - e]) e++;
  return { oursBit: x.slice(s, x.length - e).join(" "), theirsBit: y.slice(s, y.length - e).join(" ") };
}

async function compare() {
  const books = await loadBible();
  const res = await fetch(SECOND);
  if (!res.ok) throw new Error(`the second text could not be downloaded (${res.status})`);
  const text = readZipText(Buffer.from(await res.arrayBuffer()));

  // The second text lists verses in Bible order, so the order the book codes first appear in matches our books.
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

  const diffs: Diff[] = [];
  const missingInTheirs: string[] = [];
  const used = new Set<string>();
  let compared = 0;
  let same = 0;
  books.forEach((b, bi) => {
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
        compared++;
        const o = norm(v.text);
        if (o === t) same++;
        else diffs.push({ ref, ours: o, theirs: t, ...bits(o, t) });
      }
    }
  });
  const missingInOurs = [...theirs.keys()].filter((k) => !used.has(k)).length;
  return { diffs, missingInTheirs, missingInOurs, compared, same, lines, codes: codeOrder.length };
}

export default async function Page() {
  let out: Awaited<ReturnType<typeof compare>> | null = null;
  let problem = "";
  try {
    out = await compare();
  } catch (e) {
    problem = e instanceof Error ? e.message : "unknown problem";
  }

  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", lineHeight: 1.5 }}>
      <h1>Text check (temporary)</h1>
      {!out ? (
        <p>The comparison could not run: {problem}</p>
      ) : (
        <>
          <p>
            Second text lines read: {out.lines}. Book codes seen: {out.codes}. Verses compared: {out.compared}. Identical:{" "}
            {out.same}. Different: {out.diffs.length}. In ours but not theirs: {out.missingInTheirs.length}. In theirs but not
            ours: {out.missingInOurs}.
          </p>
          {out.missingInTheirs.length > 0 && <p>Not found in theirs (first 50): {out.missingInTheirs.slice(0, 50).join("; ")}</p>}
          <hr />
          {out.diffs.map((d) => (
            <div key={d.ref} style={{ marginBottom: "1rem" }}>
              <b>{d.ref}</b>
              <div>
                ours differs: [{d.oursBit}] | theirs: [{d.theirsBit}]
              </div>
              <div>OURS: {d.ours}</div>
              <div>THEIRS: {d.theirs}</div>
            </div>
          ))}
        </>
      )}
    </main>
  );
}
