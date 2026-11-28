import type { Metadata } from "next";
import { inflateRawSync } from "node:zlib";
import { loadBible } from "@/lib/bible";

// Temporary page: lists the Psalm titles found in the eBible.org King James text.
// No menu link, not in the sitemap, hidden from search engines. Any problem shows as a message.
export const dynamic = "force-static";
export const metadata: Metadata = {
  title: "Psalm titles check",
  robots: { index: false, follow: false, nocache: true },
};

const SECOND = "https://ebible.org/Scriptures/eng-kjv2006_vpl.zip";

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

function cleanTheirs(s: string): string {
  return norm(
    s
      .replace(/\{[^}]*\}/g, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\[(?:[HG])?\d+\]/g, " ")
      .replace(/[\[\]]/g, "")
  );
}

function softenNames(s: string): string {
  return s.replace(/\bLORD\b/g, "Lord").replace(/\bGOD\b/g, "God").replace(/\bJEHOVAH\b/g, "Jehovah");
}

async function titles() {
  const books = await loadBible();
  const bi = books.findIndex((b) => b.slug === "psalms");
  if (bi < 0) throw new Error("Psalms not found in our text");

  const res = await fetch(SECOND);
  if (!res.ok) throw new Error(`the second text could not be downloaded (${res.status})`);
  const text = readZipText(Buffer.from(await res.arrayBuffer()));

  // Book codes in order of first appearance; the Psalms are the 19th book.
  const codeOrder: string[] = [];
  const theirs = new Map<string, string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^([1-3A-Z][A-Z0-9]{2})\s+(\d+):(\d+)\s+(.*)$/.exec(line.trim());
    if (!m) continue;
    let idx = codeOrder.indexOf(m[1]);
    if (idx < 0) {
      codeOrder.push(m[1]);
      idx = codeOrder.length - 1;
    }
    if (idx === bi) theirs.set(`${Number(m[2])}|${Number(m[3])}`, softenNames(cleanTheirs(m[4])));
  }

  const found: string[] = [];
  const unsplit: string[] = [];
  const none: number[] = [];
  for (const c of books[bi].chapters) {
    const v1 = c.verses.find((v) => v.number === 1);
    const t0 = theirs.get(`${c.number}|0`);
    const t1 = theirs.get(`${c.number}|1`) ?? "";
    const o = norm(v1?.text ?? "");
    if (t0) {
      found.push(`${c.number}|${t0}`);
    } else if (t1 === o) {
      none.push(c.number);
    } else if (t1.endsWith(o) && t1.length > o.length) {
      found.push(`${c.number}|${t1.slice(0, t1.length - o.length).trim()}`);
    } else {
      unsplit.push(`${c.number}\n   OURS:   ${o}\n   THEIRS: ${t1}`);
    }
  }
  return { found, unsplit, none };
}

export default async function Page() {
  let out: Awaited<ReturnType<typeof titles>> | null = null;
  let problem = "";
  try {
    out = await titles();
  } catch (e) {
    problem = e instanceof Error ? e.message : "unknown problem";
  }
  return (
    <main style={{ maxWidth: 1000, margin: "0 auto", padding: "2rem 1rem", fontFamily: "sans-serif", lineHeight: 1.4 }}>
      <h1>Psalm titles check (temporary)</h1>
      {!out ? (
        <p>This could not run: {problem}</p>
      ) : (
        <>
          <p>
            Titles found: {out.found.length}. Psalms with no title: {out.none.length} ({out.none.join(", ")}). Could not separate:{" "}
            {out.unsplit.length}.
          </p>
          <h2>Titles (chapter number | title)</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{out.found.join("\n")}</pre>
          <h2>Could not separate</h2>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: "0.9rem" }}>{out.unsplit.join("\n")}</pre>
        </>
      )}
    </main>
  );
}
