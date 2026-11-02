import { commitFiles, readFile, snapshot, type FileChange, type Snapshot } from "./github";

/** Helpers for the editor's content panels (blog, history), which save JSON files in src/content. */

export const tidy = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");

/** Keeps paragraphs and line breaks; trims trailing spaces and runs of blank lines. */
export const tidyText = (s: unknown, max: number) =>
  typeof s === "string"
    ? s
        .replace(/\r\n?/g, "\n")
        .replace(/[ \t]+$/gm, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max)
    : "";

export function isRealDate(d: unknown): d is string {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

export const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

export async function readJson<T>(path: string, snap: Snapshot, fallback: T): Promise<T> {
  const text = await readFile(path, snap);
  return text === null ? fallback : (JSON.parse(text) as T);
}

/** One commit, tried twice: if the site changed underneath us, read it again. */
export async function save(build: (snap: Snapshot) => Promise<{ changes: FileChange[]; message: string } | Response>) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const snap = await snapshot({ withFiles: false });
    const plan = await build(snap);
    if (plan instanceof Response) return plan;
    const done = await commitFiles(snap.commit, plan.changes, plan.message);
    if (done) return Response.json({ ok: true, commit: done.commit });
  }
  return Response.json({ error: "The site changed while saving. Save again." }, { status: 409 });
}
