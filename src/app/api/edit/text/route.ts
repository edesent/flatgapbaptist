import { sameOrigin, sessionEmail } from "@/edit/auth";
import { commitFiles, snapshot } from "@/edit/github";
import { encode, locate, routeFiles, tidy, type Spot } from "@/edit/textmatch";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Change = { path: string; text: string; to: string; context: string[] };

const MAX_LEN = 2000;
const clip = (s: string, n = 160) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Publish text changed on the page. Each change is the text as it was on the
 * page, what it should say now, and the text around it. All are matched
 * against the branch as it is right now; if any can't be placed exactly
 * (someone changed it meanwhile, or it now appears twice) nothing is saved.
 */
export async function POST(req: Request) {
  const email = await sessionEmail();
  if (!email) return Response.json({ error: "Your sign-in ran out. Sign in again to publish." }, { status: 401 });
  if (!sameOrigin(req)) return Response.json({ error: "Bad origin." }, { status: 403 });

  const body = (await req.json().catch(() => null)) as { changes?: unknown } | null;
  const raw = Array.isArray(body?.changes) ? body.changes.slice(0, 200) : [];
  const changes: Change[] = [];
  for (const c of raw as Partial<Change>[]) {
    if (typeof c?.path !== "string" || typeof c.text !== "string" || typeof c.to !== "string") {
      return Response.json({ error: "That change couldn’t be read." }, { status: 400 });
    }
    const to = tidy(c.to);
    if (!to) return Response.json({ error: "Text can’t be left empty." }, { status: 400 });
    if (to.length > MAX_LEN) return Response.json({ error: `Keep each piece of text under ${MAX_LEN} characters.` }, { status: 400 });
    const context = Array.isArray(c.context) ? c.context.filter((x): x is string => typeof x === "string").slice(0, 8) : [];
    changes.push({ path: c.path, text: tidy(c.text), to, context });
  }
  if (!changes.length) return Response.json({ error: "Nothing to publish." }, { status: 400 });

  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const snap = await snapshot();
      const problems: { i: number; reason: string }[] = [];
      const edits = new Map<string, { spot: Spot; to: string; change: Change }[]>();
      changes.forEach((c, i) => {
        const found = locate(snap.files, c.text, routeFiles(c.path, snap.files.keys()), c.context);
        if (!found.ok) return problems.push({ i, reason: found.reason });
        const list = edits.get(found.spot.file) ?? [];
        if (list.some((e) => e.spot.start < found.spot.end && found.spot.start < e.spot.end)) return problems.push({ i, reason: "repeated" });
        list.push({ spot: found.spot, to: c.to, change: c });
        edits.set(found.spot.file, list);
      });
      if (problems.length) return Response.json({ error: "problems", problems }, { status: 409 });

      const files = [...edits].map(([file, list]) => {
        let src = snap.files.get(file)!;
        for (const e of [...list].sort((a, b) => b.spot.start - a.spot.start)) {
          src = src.slice(0, e.spot.start) + encode(e.spot.kind, e.to) + src.slice(e.spot.end);
        }
        return { path: file, content: src };
      });
      const all = [...edits.values()].flat();
      const subject =
        all.length === 1
          ? `Edit text on ${all[0].change.path}: “${clip(all[0].change.text, 50)}”`
          : `Edit text: ${all.length} changes on ${[...new Set(all.map((e) => e.change.path))].join(", ")}`;
      const lines = all.map((e) => `${e.spot.file}\n  was: ${clip(e.change.text)}\n  now: ${clip(e.to)}`);
      const message = `${subject}\n\n${lines.join("\n\n")}\n\nEdited by ${email} on ${req.headers.get("host")}.`;

      const done = await commitFiles(snap.commit, files, message);
      if (done) return Response.json({ ok: true, commit: done.commit });
    }
    return Response.json({ error: "The site changed while saving. Publish again." }, { status: 409 });
  } catch (e) {
    console.error("edit text publish", e);
    return Response.json({ error: "Publishing failed — nothing was changed. Try again in a minute." }, { status: 502 });
  }
}
