import { sameOrigin, sessionEmail } from "@/edit/auth";
import { commitFiles, readFile, snapshot, type FileChange, type Snapshot } from "@/edit/github";
import { nowInChurch } from "@/lib/schedule";
import type { Notice, SpecialEvent } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The editor's Events and Notice panels. Both files are plain JSON the home
 * page reads (src/lib/site.ts); every save is one commit, so Vercel deploys it.
 *
 *   GET                                  → { events, notice }
 *   POST { event: {...}, replaceId? }    → add or change an event
 *   POST { notice: { text, until } }     → put up, change or (empty text) take down the notice
 *   DELETE { id }                        → remove an event
 */

const EVENTS = "src/content/events.json";
const NOTICE = "src/content/notice.json";

const tidy = (s: unknown, max: number) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, max) : "");
const sortEvents = (list: SpecialEvent[]) => [...list].sort((a, b) => a.start.localeCompare(b.start));
const json = (v: unknown) => `${JSON.stringify(v, null, 2)}\n`;

function isRealDate(d: unknown): d is string {
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const t = new Date(`${d}T12:00:00Z`);
  return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d;
}

const fmt = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "short", day: "numeric", year: "numeric" });

function slugId(title: string, start: string) {
  const words = title
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48)
    .replace(/-$/, "");
  return `${words || "event"}-${start}`;
}

async function readJson<T>(path: string, snap: Snapshot, fallback: T): Promise<T> {
  const text = await readFile(path, snap);
  return text === null ? fallback : (JSON.parse(text) as T);
}

/** Try the commit twice: if the site changed underneath us, read it again. */
async function save(build: (snap: Snapshot) => Promise<{ changes: FileChange[]; message: string } | Response>) {
  for (let attempt = 0; attempt < 2; attempt++) {
    const snap = await snapshot({ withFiles: false });
    const plan = await build(snap);
    if (plan instanceof Response) return plan;
    const done = await commitFiles(snap.commit, plan.changes, plan.message);
    if (done) return Response.json({ ok: true, commit: done.commit });
  }
  return Response.json({ error: "The site changed while saving. Save again." }, { status: 409 });
}

export async function GET() {
  if (!(await sessionEmail())) return Response.json({ error: "Sign in again." }, { status: 401 });
  try {
    const snap = await snapshot({ withFiles: false });
    const events = sortEvents(await readJson<SpecialEvent[]>(EVENTS, snap, []));
    const notice = await readJson<Notice>(NOTICE, snap, { text: "", until: "" });
    return Response.json({ events, notice }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("board read", e);
    return Response.json({ error: "Couldn’t read the events. Try again in a minute." }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again to save." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const body = ((await req.json().catch(() => null)) ?? {}) as Record<string, unknown>;
  const by = `\n\nBy ${email} on ${req.headers.get("host")}.`;
  const today = nowInChurch().date;

  try {
    // ── The notice ──
    if (body.notice && typeof body.notice === "object") {
      const n = body.notice as Record<string, unknown>;
      const text = tidy(n.text, 200);
      const until = text && n.until ? n.until : "";
      if (until !== "" && !isRealDate(until)) return Response.json({ error: "The take-down date isn’t a real date." }, { status: 400 });
      if (until && until < today) return Response.json({ error: "That take-down date has already passed." }, { status: 400 });
      const next: Notice = { text, until: until as string };
      return await save(async () => ({
        changes: [{ path: NOTICE, content: json(next) }],
        message: text ? `Notice: ${text}${until ? ` (until ${fmt(until as string)})` : ""}${by}` : `Take down the notice${by}`,
      }));
    }

    // ── An event ──
    const b = (body.event ?? {}) as Record<string, unknown>;
    const title = tidy(b.title, 100);
    if (!title) return Response.json({ error: "Give the event a name." }, { status: 400 });
    if (!isRealDate(b.start)) return Response.json({ error: "Pick the day of the event." }, { status: 400 });
    const start = b.start;
    const endsOn = b.endsOn ? b.endsOn : start;
    if (!isRealDate(endsOn)) return Response.json({ error: "The last day isn’t a real date." }, { status: 400 });
    if (endsOn < start) return Response.json({ error: "The last day can’t be before the first." }, { status: 400 });
    if (endsOn < today) return Response.json({ error: "That date has already passed." }, { status: 400 });
    const time24 = typeof b.time24 === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(b.time24) ? b.time24 : undefined;
    const summary = tidy(b.summary, 400);
    const replaceId = typeof body.replaceId === "string" ? body.replaceId : undefined;

    return await save(async (snap) => {
      const list = await readJson<SpecialEvent[]>(EVENTS, snap, []);
      const existing = replaceId ? list.find((e) => e.id === replaceId) : undefined;
      if (replaceId && !existing) return Response.json({ error: "That event is no longer on the site. Close this and open Events again." }, { status: 409 });
      let id = existing?.id ?? slugId(title, start);
      for (let n = 2; !existing && list.some((e) => e.id === id); n++) id = `${slugId(title, start)}-${n}`;
      const ev: SpecialEvent = { id, title, start, endsOn, ...(time24 ? { time24 } : {}), summary };
      return {
        changes: [{ path: EVENTS, content: json(sortEvents([...list.filter((e) => e.id !== id), ev])) }],
        message: `${existing ? "Change" : "Add"} event: ${title} (${fmt(start)})${by}`,
      };
    });
  } catch (e) {
    console.error("board save", e);
    return Response.json({ error: "Saving failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}

export async function DELETE(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });
  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return Response.json({ error: "Which event?" }, { status: 400 });

  try {
    return await save(async (snap) => {
      const list = await readJson<SpecialEvent[]>(EVENTS, snap, []);
      const existing = list.find((e) => e.id === id);
      if (!existing) return Response.json({ error: "That event is already gone." }, { status: 409 });
      return {
        changes: [{ path: EVENTS, content: json(list.filter((e) => e.id !== id)) }],
        message: `Remove event: ${existing.title} (${fmt(existing.start)})\n\nBy ${email} on ${req.headers.get("host")}.`,
      };
    });
  } catch (e) {
    console.error("board remove", e);
    return Response.json({ error: "Removing failed. Nothing was changed. Try again in a minute." }, { status: 502 });
  }
}
