import { inflateRawSync } from "node:zlib";
import type { Book } from "./bible";

/**
 * Prints God's covenant name the way King James Bibles do in the Old Testament:
 * LORD (and GOD, JEHOVAH) in capitals where the Hebrew has the name Jehovah,
 * and ordinary "Lord" and "God" where it does not.
 *
 * The capitals are copied, word for word, from the public-domain King James text at eBible.org
 * while the site is being built. This never stops the build: if that text can't be downloaded,
 * or a verse doesn't line up with ours, the verse simply keeps its ordinary wording.
 * Only the Old Testament is changed.
 */
const SECOND = "https://ebible.org/Scriptures/eng-kjv2006_vpl.zip";

function readZipText(buf: Buffer): string {
  let end = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  }
  if (end < 0) throw new Error("zip directory not found");
  const count = buf.readUInt16LE(end + 10);
  let p = buf.readUInt32LE(end + 16);
  let best: { local: number; csize: number; method: number; size: number } | null = null;
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("zip directory unreadable");
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
  if (!best) throw new Error("no text file in zip");
  const start = best.local + 30 + buf.readUInt16LE(best.local + 26) + buf.readUInt16LE(best.local + 28);
  const data = buf.subarray(start, start + best.csize);
  return (best.method === 0 ? data : inflateRawSync(data)).toString("utf8");
}

/** Their verse, with reference numbers, tags, and the brackets that mark italic words removed. */
function cleanTheirs(s: string): string {
  return s
    .replace(/\{[^}]*\}/g, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/\[(?:[HG])?\d+\]/g, " ")
    .replace(/[\[\]]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[¶#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const key = (w: string) => w.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

/** Gives our word the capitals their matching word has. */
function carry(ours: string, theirs: string): string {
  let out = ours;
  if (/LORD/.test(theirs)) out = out.replace("Lord", "LORD");
  if (/GOD/.test(theirs)) out = out.replace("God", "GOD");
  if (/JEHOVAH/.test(theirs)) out = out.replace("Jehovah", "JEHOVAH");
  return out;
}

/** Matches the words at the start and at the end of the verse; anything in a differing middle stays as it is. */
function capitalize(ours: string, theirs: string): string {
  const ow = ours.split(" ");
  const tw = theirs.split(" ");
  let p = 0;
  while (p < ow.length && p < tw.length && key(ow[p]) === key(tw[p])) p++;
  let s = 0;
  while (s < ow.length - p && s < tw.length - p && key(ow[ow.length - 1 - s]) === key(tw[tw.length - 1 - s])) s++;
  for (let i = 0; i < p; i++) ow[i] = carry(ow[i], tw[i]);
  for (let j = 0; j < s; j++) ow[ow.length - 1 - j] = carry(ow[ow.length - 1 - j], tw[tw.length - 1 - j]);
  return ow.join(" ");
}

export async function applyCovenantCapitals(books: Book[]): Promise<void> {
  try {
    const res = await fetch(SECOND);
    if (!res.ok) return;
    const text = readZipText(Buffer.from(await res.arrayBuffer()));

    // The second text lists books in Bible order, so the order its book codes first appear in matches our books.
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
      theirs.set(`${idx}|${Number(m[2])}|${Number(m[3])}`, cleanTheirs(m[4]));
    }
    if (codeOrder.length < 66) return; // not the whole Bible: change nothing

    books.forEach((b, bi) => {
      if (b.testament !== "OT") return;
      for (const c of b.chapters) {
        for (const v of c.verses) {
          const t = theirs.get(`${bi}|${c.number}|${v.number}`);
          if (!t || !/\b(?:LORD|GOD|JEHOVAH)\b/.test(t)) continue;
          v.text = capitalize(v.text, t);
        }
      }
    });
  } catch {
    // Any problem: leave the text exactly as it is.
  }
}
