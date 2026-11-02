"use client";

import "./editor.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { EDITOR } from "./config";

/**
 * The pastor's editor, opened at /edit.
 *
 * Any text inside <main> that the server can trace to exactly one place in
 * the source gets outlined on hover. Clicking it opens a box to rewrite it;
 * Publish sends every change (with the text around it, to tell repeats apart)
 * to /api/edit/text, which commits them. The site itself is never restructured
 * for this — the page's own text nodes are read and updated in place.
 */

type Note = { tone: "info" | "good" | "bad"; text: string };
type Edit = { path: string; text: string; to: string; context: string[]; where: string };
type Deploy = {
  commit: string;
  state: "pending" | "live" | "failed";
  startedAt: number;
  /** Text edits to look for on the live pages once deployed. */
  check: { path: string; to: string }[];
};
type Confirm = { kind: "publish"; problems?: Record<string, string> } | { kind: "exit" };
/** Events and the notice live in src/content/*.json; /api/edit/board reads and saves them. */
type BoardEvent = { id: string; title: string; start: string; endsOn: string; time24?: string; summary: string };
type Board = { events: BoardEvent[]; notice: { text: string; until: string } };
type EventForm = { replaceId?: string; title: string; start: string; endsOn: string; time24: string; summary: string };
type Panel =
  | { kind: "events" }
  | { kind: "event"; form: EventForm }
  | { kind: "remove"; ev: BoardEvent }
  | { kind: "notice"; text: string; until: string }
  | { kind: "blog"; posts: BlogPost[] }
  | { kind: "post"; form: PostForm; original: string }
  | { kind: "removePost"; post: BlogPost }
  | { kind: "history"; body: string; original: string };
/** Blog articles live in src/content/blog.json (/api/edit/blog); the history page in src/content/history.json. */
type BlogPost = { slug: string; title: string; date: string; body: string; photo?: { src: string; alt: string } };
type PostPhoto = { kind: "none" } | { kind: "keep"; src: string } | { kind: "new"; url: string; blob: Blob };
type PostForm = { slug?: string; title: string; date: string; body: string; photo: PostPhoto };

const BLANK_EVENT: EventForm = { title: "", start: "", endsOn: "", time24: "", summary: "" };
/** Today at the church, as YYYY-MM-DD (the earliest date the forms accept). */
const churchToday = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const dayName = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric", year: "numeric" });
function timeName(t: string) {
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}
const eventWhen = (ev: Pick<BoardEvent, "start" | "endsOn" | "time24">) =>
  ev.endsOn && ev.endsOn !== ev.start
    ? `${dayName(ev.start)} – ${dayName(ev.endsOn)}`
    : `${dayName(ev.start)}${ev.time24 ? ` at ${timeName(ev.time24)}` : ""}`;

/** A photo as a JPEG no wider than 1800px, the way it will be committed. */
async function shrinkPhoto(file: File) {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.84));
}
const formKey = (f: PostForm) => JSON.stringify([f.title, f.date, f.body, f.photo.kind, f.photo.kind === "keep" ? f.photo.src : ""]);

const DRAFT_KEY = `${EDITOR.storagePrefix}-edit-draft`;
/** What we tell people a publish takes to reach the live site (Vercel build + deploy). */
const LIVE_SECONDS = 120;

const tidy = (s: string) => s.replace(/\s+/g, " ").trim();
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const clip = (s: string, n = 140) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const clock = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
const keyOf = (path: string, text: string, context: string[]) => `${path}\u0000${text}\u0000${context.join("\u0001")}`;
/** /edit shows the home page. */
const pagePath = (p: string) => (p === "/edit" ? "/" : p);

const solid = "dfd-editor-btn dfd-editor-btn--solid";
const outline = "dfd-editor-btn dfd-editor-btn--outline";
const onDark = "dfd-editor-btn dfd-editor-btn--dark";
const field = "dfd-editor-field";

function loadDraft(): Edit[] {
  try {
    return JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "[]") as Edit[];
  } catch {
    return [];
  }
}
function saveDraft(list: Edit[]) {
  try {
    if (list.length) localStorage.setItem(DRAFT_KEY, JSON.stringify(list));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {}
}

/* ── Reading the page ───────────────────────────────────────────────────── */

const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "OPTION", "SELECT", "TEMPLATE"]);

function textNodes(root: Node) {
  const out: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(n) {
      const el = n.parentElement;
      if (!el || SKIP.has(el.tagName) || el.closest("svg, [data-edit-skip]")) return NodeFilter.FILTER_REJECT;
      return /[A-Za-z0-9]/.test(n.nodeValue ?? "") ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    },
  });
  for (let n = walker.nextNode(); n; n = walker.nextNode()) out.push(n as Text);
  return out;
}

/** The texts nearest this one on the page — up to four levels out, closest first. */
function contextOf(node: Text, all: Text[], original: (t: Text) => string) {
  const order = new Map(all.map((n, i) => [n, i]));
  const here = order.get(node) ?? 0;
  const seen = new Set<Text>([node]);
  const out: string[] = [];
  let el: Element | null = node.parentElement;
  for (let level = 0; el && level < 4 && out.length < 8; level++, el = el.parentElement) {
    const inside = all.filter((n) => !seen.has(n) && el!.contains(n));
    inside.sort((a, b) => Math.abs((order.get(a) ?? 0) - here) - Math.abs((order.get(b) ?? 0) - here));
    for (const n of inside) {
      seen.add(n);
      out.push(tidy(original(n)));
      if (out.length >= 8) break;
    }
  }
  return out;
}

/* ── The dialog shell ───────────────────────────────────────────────────── */

function Dialog({ title, wide, children }: { title: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className="dfd-editor-modal">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-dialog-title"
        className={`dfd-editor-dialog ${wide ? "dfd-editor-dialog--wide" : ""}`}
      >
        <h2 id="edit-dialog-title" className="dfd-editor-title">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

/** `onClose` leaves edit mode (EditGate reloads the page fresh, without the editor). */
export function Editor({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState<string | null | undefined>(undefined);
  const [preview, setPreview] = useState(false);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<Note | null>(null);
  const [deploy, setDeploy] = useState<Deploy | null>(null);
  const [confirm, setConfirm] = useState<Confirm | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [addr, setAddr] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  // The text box for one piece of text.
  const [open, setOpen] = useState<{ node: Text; text: string; context: string[]; where: string; value: string } | null>(null);
  // The Events / Notice panels.
  const [panel, setPanel] = useState<Panel | null>(null);
  const [board, setBoard] = useState<Board | null>(null);

  /** Per text node: its words as the source has them (before any edit here) and where they live. */
  const original = useRef(new WeakMap<Text, string>());
  const placed = useRef(new WeakMap<Text, { where: string; context: string[] }>());
  const answers = useRef(new Map<string, string | null>());
  const editsRef = useRef<Edit[]>([]);
  editsRef.current = edits;

  const textOf = useCallback((n: Text) => original.current.get(n) ?? n.nodeValue ?? "", []);

  const writeEdits = useCallback((next: Edit[]) => {
    setEdits(next);
    saveDraft(next);
  }, []);

  /** Show every change on the page, gold-outlined; anything else shows its original words. */
  const paint = useCallback(() => {
    const main = document.querySelector("main");
    if (!main) return;
    const path = location.pathname;
    for (const node of textNodes(main)) {
      const info = placed.current.get(node);
      if (!info) continue;
      const was = textOf(node);
      const edit = editsRef.current.find((e) => e.path === path && e.text === tidy(was) && e.context.join() === info.context.join());
      const raw = node.nodeValue ?? "";
      const lead = raw.match(/^\s*/)![0];
      const trail = raw.match(/\s*$/)![0];
      const want = edit ? `${lead}${edit.to}${trail}` : was;
      if (!original.current.has(node)) original.current.set(node, raw);
      if (raw !== want) node.nodeValue = want;
      node.parentElement?.toggleAttribute("data-txt-changed", Boolean(edit));
    }
  }, [textOf]);

  /** Ask which texts on this page can be edited, then mark them. */
  const scan = useCallback(async () => {
    const main = document.querySelector("main");
    if (!main) return;
    const path = location.pathname;
    const nodes = textNodes(main);
    const items = nodes.map((n) => {
      const text = tidy(textOf(n));
      const context = contextOf(n, nodes, textOf);
      return { n, text, context, key: keyOf(path, text, context) };
    });
    const unknown = items.filter((it) => !answers.current.has(it.key));
    if (unknown.length) {
      setScanning(true);
      try {
        const r = await fetch("/api/edit/locate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ path: pagePath(path), items: unknown.map(({ text, context }) => ({ text, context })) }),
        });
        if (r.status === 401) return setEmail(null);
        const j = (await r.json()) as { results?: (string | null)[]; error?: string };
        if (!r.ok || !j.results) throw new Error(j.error);
        unknown.forEach((it, i) => answers.current.set(it.key, j.results![i] ?? null));
      } catch {
        setNote({ tone: "bad", text: "Couldn’t check which text is editable. Reload the page to try again." });
        return;
      } finally {
        setScanning(false);
      }
    }
    if (location.pathname !== path) return;
    for (const it of items) {
      const where = answers.current.get(it.key);
      if (where) {
        placed.current.set(it.n, { where, context: it.context });
        it.n.parentElement?.setAttribute("data-txt", "");
      }
    }
    paint();
    // Changes waiting for a page that shows them; flag any this page can no longer place.
    setMissing(
      editsRef.current
        .filter((e) => e.path === path && !items.some((it) => it.text === e.text && answers.current.get(it.key)))
        .map((e) => e.text),
    );
  }, [paint, textOf]);

  /* ── Session ── */

  useEffect(() => {
    const html = document.documentElement;
    html.dataset.editor = "";
    html.style.setProperty("--dfd-editor-accent", EDITOR.accent);
    const url = new URL(location.href);
    if (url.searchParams.get("signin") === "expired") {
      setNote({ tone: "bad", text: "That sign-in link has expired. Send yourself a new one." });
      url.searchParams.delete("signin");
      history.replaceState(history.state, "", url);
    }
    fetch("/api/edit/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { email?: string | null }) => setEmail(j.email ?? null))
      .catch(() => setEmail(null));
    const draft = loadDraft();
    if (draft.length) {
      setEdits(draft);
      setNote({ tone: "info", text: `${plural(draft.length, "change")} you hadn’t published yet ${draft.length === 1 ? "is" : "are"} back, outlined in gold.` });
    }
    return () => {
      delete html.dataset.editor;
      html.style.removeProperty("--dfd-editor-accent");
    };
  }, []);

  const editing = Boolean(email) && !preview;

  /* ── Edit mode: mark text, follow page changes, catch clicks ── */

  useEffect(() => {
    if (!editing) return;
    const html = document.documentElement;
    html.dataset.editing = "";
    scan();

    let timer = 0;
    let lastPath = location.pathname;
    const mo = new MutationObserver(() => {
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        if (location.pathname !== lastPath) lastPath = location.pathname;
        scan();
      }, 350);
    });
    const main = document.querySelector("main");
    if (main) mo.observe(main, { childList: true, subtree: true });

    let hovered: Element | null = null;
    const onOver = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("main [data-txt]") : null;
      if (el === hovered) return;
      hovered?.removeAttribute("data-txt-hover");
      hovered = el;
      el?.setAttribute("data-txt-hover", "");
    };
    const onClick = (e: MouseEvent) => {
      const el = e.target instanceof Element ? e.target.closest("main [data-txt]") : null;
      if (!el) return;
      // Which of this element's own texts was clicked.
      const own = [...el.childNodes].filter((n): n is Text => n.nodeType === Node.TEXT_NODE && placed.current.has(n as Text));
      // The text under the pointer; an element with just one text counts anywhere on it.
      const node =
        own.find((n) => {
          const range = document.createRange();
          range.selectNodeContents(n);
          return [...range.getClientRects()].some((r) => e.clientX >= r.left - 2 && e.clientX <= r.right + 2 && e.clientY >= r.top - 2 && e.clientY <= r.bottom + 2);
        }) ?? (own.length === 1 ? own[0] : undefined);
      if (!node) return;
      e.preventDefault();
      e.stopPropagation();
      setNote(null);
      const info = placed.current.get(node)!;
      setOpen({ node, text: tidy(textOf(node)), context: info.context, where: info.where, value: tidy(node.nodeValue ?? "") });
    };
    document.addEventListener("mouseover", onOver);
    window.addEventListener("click", onClick, true);
    return () => {
      delete html.dataset.editing;
      clearTimeout(timer);
      mo.disconnect();
      hovered?.removeAttribute("data-txt-hover");
      document.removeEventListener("mouseover", onOver);
      window.removeEventListener("click", onClick, true);
    };
  }, [editing, scan, textOf]);

  /* ── Dialog plumbing ── */

  const dialogOpen = email === null || confirm !== null || open !== null || panel !== null;
  useEffect(() => {
    if (!dialogOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialogOpen]);

  useEffect(() => {
    if (!confirm && !open && !panel) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape" || busy) return;
      // Escape never throws away an article or the history text being written.
      if (panel?.kind === "post" || panel?.kind === "history") return;
      setConfirm(null);
      setOpen(null);
      setPanel(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, open, panel, busy]);

  useEffect(() => {
    // An article or the history text being written counts as unsaved too.
    const writing = panel?.kind === "post" || panel?.kind === "history";
    const warn = (e: BeforeUnloadEvent) => {
      if (editsRef.current.length || writing) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [panel?.kind]);

  /* ── After publishing: count down, watch the deploy, then check the page ── */

  useEffect(() => {
    if (deploy?.state !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    let tries = 0;
    const poll = setInterval(async () => {
      if (++tries > 72) return clearInterval(poll);
      const j = (await fetch(`/api/edit/status?commit=${deploy.commit}`, { cache: "no-store" })
        .then((r) => r.json())
        .catch(() => null)) as { state?: Deploy["state"] } | null;
      if (!j?.state || j.state === "pending") return;
      setDeploy({ ...deploy, state: j.state });
      if (j.state !== "live" || !deploy.check.length) return;
      // Make sure each change shows up on the page it was made on.
      const notShown: string[] = [];
      for (const c of deploy.check) {
        const html = await fetch(`${c.path}?fresh=${Date.now()}`, { cache: "no-store" })
          .then((r) => r.text())
          .catch(() => "");
        const doc = new DOMParser().parseFromString(html, "text/html");
        if (!tidy(doc.querySelector("main")?.textContent ?? "").includes(c.to)) notShown.push(c.to);
      }
      if (notShown.length) {
        setNote({
          tone: "bad",
          text: `Published, but ${plural(notShown.length, "change")} didn’t show up where you made ${notShown.length === 1 ? "it" : "them"}: “${clip(notShown[0], 60)}”. Let Eli know.`,
        });
      }
    }, 5000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [deploy]);

  /* ── Actions ── */

  async function requestLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/edit/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: addr }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (r.ok) setSent(addr.trim());
      else setNote({ tone: "bad", text: j.error ?? "Couldn’t send the link. Try again." });
    } catch {
      setNote({ tone: "bad", text: "Couldn’t reach the server. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  function saveText() {
    if (!open) return;
    const to = tidy(open.value);
    if (!to) return setNote({ tone: "bad", text: "Text can’t be left empty — use Cancel to keep it." });
    const path = location.pathname;
    const rest = edits.filter((e) => !(e.path === path && e.text === open.text && e.context.join() === open.context.join()));
    writeEdits(to === open.text ? rest : [...rest, { path, text: open.text, to, context: open.context, where: open.where }]);
    setOpen(null);
    setNote(null);
    requestAnimationFrame(paint);
  }

  function undoText() {
    if (!open) return;
    const path = location.pathname;
    writeEdits(edits.filter((e) => !(e.path === path && e.text === open.text && e.context.join() === open.context.join())));
    setOpen(null);
    requestAnimationFrame(paint);
  }

  async function publish() {
    if (!edits.length || busy) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch("/api/edit/text", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ changes: edits.map(({ path, text, to, context }) => ({ path: pagePath(path), text, to, context })) }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; problems?: { i: number; reason: string }[]; commit?: string };
      if (r.status === 401) {
        setConfirm(null);
        setEmail(null);
        setNote({ tone: "bad", text: "Your sign-in ran out. Sign in again — your changes are saved on this device." });
        return;
      }
      if (j.error === "problems" && j.problems) {
        const problems: Record<string, string> = {};
        for (const p of j.problems) {
          const e = edits[p.i];
          problems[keyOf(e.path, e.text, e.context)] =
            p.reason === "repeated" ? "This text now appears in more than one place." : "This text has changed since you opened the page.";
        }
        setConfirm({ kind: "publish", problems });
        return;
      }
      if (!r.ok || !j.commit) {
        setNote({ tone: "bad", text: j.error ?? "Publishing failed. Try again." });
        setConfirm(null);
        return;
      }
      const check = edits.map((e) => ({ path: pagePath(e.path), to: e.to }));
      // The new words are the page's words now.
      for (const node of textNodes(document.querySelector("main") ?? document.body)) {
        if (placed.current.has(node) && node.parentElement?.hasAttribute("data-txt-changed")) {
          original.current.set(node, node.nodeValue ?? "");
          node.parentElement.removeAttribute("data-txt-changed");
        }
      }
      answers.current.clear();
      writeEdits([]);
      setConfirm(null);
      setDeploy({ commit: j.commit, state: "pending", startedAt: Date.now(), check });
      setNow(Date.now());
      scan();
    } catch {
      setNote({ tone: "bad", text: "Couldn’t reach the server. Nothing was published — try again." });
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  }

  /* ── Events and the notice ── */

  async function openBoard(kind: "events" | "notice") {
    setNote(null);
    setBusy(true);
    try {
      const r = await fetch("/api/edit/board", { cache: "no-store" });
      if (r.status === 401) return setEmail(null);
      const j = (await r.json().catch(() => ({}))) as Partial<Board> & { error?: string };
      if (!r.ok || !j.events || !j.notice) throw new Error(j.error);
      setBoard({ events: j.events, notice: j.notice });
      setPanel(kind === "events" ? { kind } : { kind, text: j.notice.text, until: j.notice.until });
    } catch (e) {
      setNote({ tone: "bad", text: e instanceof Error && e.message ? e.message : "Couldn’t load the events. Try again." });
    } finally {
      setBusy(false);
    }
  }

  /** Every save here is its own publish: one commit, then the same countdown as text changes. */
  async function sendBoard(method: "POST" | "DELETE", body: unknown, url = "/api/edit/board") {
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(url, {
        method,
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string; commit?: string };
      if (r.status === 401) {
        setPanel(null);
        setEmail(null);
        setNote({ tone: "bad", text: "Your sign-in ran out. Sign in again, then make that change again." });
        return;
      }
      if (!r.ok || !j.commit) return setNote({ tone: "bad", text: j.error ?? "Saving failed. Try again." });
      setPanel(null);
      setDeploy({ commit: j.commit, state: "pending", startedAt: Date.now(), check: [] });
      setNow(Date.now());
    } catch {
      setNote({ tone: "bad", text: "Couldn’t reach the server. Nothing was saved. Try again." });
    } finally {
      setBusy(false);
    }
  }

  function saveEvent(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "event") return;
    const { replaceId, ...f } = panel.form;
    sendBoard("POST", { replaceId, event: { ...f, endsOn: f.endsOn || f.start } });
  }

  /* ── The blog and the history page ── */

  async function openContent(kind: "blog" | "history") {
    setNote(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/edit/${kind}`, { cache: "no-store" });
      if (r.status === 401) return setEmail(null);
      const j = (await r.json().catch(() => ({}))) as { posts?: BlogPost[]; body?: string; error?: string };
      if (!r.ok) throw new Error(j.error);
      if (kind === "blog") setPanel({ kind, posts: j.posts ?? [] });
      else setPanel({ kind, body: j.body ?? "", original: j.body ?? "" });
    } catch (e) {
      setNote({ tone: "bad", text: e instanceof Error && e.message ? e.message : "Couldn’t load that. Try again." });
    } finally {
      setBusy(false);
    }
  }

  function editPost(post?: BlogPost) {
    const form: PostForm = post
      ? { slug: post.slug, title: post.title, date: post.date, body: post.body, photo: post.photo ? { kind: "keep", src: post.photo.src } : { kind: "none" } }
      : { title: "", date: churchToday(), body: "", photo: { kind: "none" } };
    setNote(null);
    setPanel({ kind: "post", form, original: formKey(form) });
  }

  async function choosePhoto(file: File | undefined) {
    if (panel?.kind !== "post" || !file) return;
    try {
      const blob = await shrinkPhoto(file);
      if (panel.form.photo.kind === "new") URL.revokeObjectURL(panel.form.photo.url);
      setPanel({ ...panel, form: { ...panel.form, photo: { kind: "new", url: URL.createObjectURL(blob), blob } } });
      setNote(null);
    } catch {
      setNote({
        tone: "bad",
        text: `“${file.name}” couldn’t be opened. Use a photo (JPG or PNG)${/heic|heif/i.test(file.name) ? ". iPhone HEIC photos need to be saved as JPG first" : ""}.`,
      });
    }
  }

  async function savePost(e: React.FormEvent) {
    e.preventDefault();
    if (panel?.kind !== "post" || busy) return;
    const f = panel.form;
    let photo: { keep: true } | { sha: string } | null = f.photo.kind === "keep" ? { keep: true } : null;
    if (f.photo.kind === "new") {
      setBusy(true);
      setNote(null);
      try {
        const r = await fetch("/api/edit/photo", { method: "POST", headers: { "content-type": "image/jpeg" }, body: f.photo.blob });
        const j = (await r.json().catch(() => ({}))) as { sha?: string; error?: string };
        if (r.status === 401) {
          setBusy(false);
          return setNote({ tone: "bad", text: "Your sign-in ran out. Copy your article somewhere safe, sign in again, then add it again." });
        }
        if (!r.ok || !j.sha) throw new Error(j.error);
        photo = { sha: j.sha };
      } catch (err) {
        setBusy(false);
        return setNote({ tone: "bad", text: err instanceof Error && err.message ? err.message : "Uploading the photo failed. Try again." });
      }
    }
    await sendBoard("POST", { slug: f.slug, title: f.title, date: f.date, body: f.body, photo }, "/api/edit/blog");
  }

  /** Closing a form with unsaved writing asks first. */
  function leaveForm(next: Panel | null) {
    const dirty =
      (panel?.kind === "post" && formKey(panel.form) !== panel.original) || (panel?.kind === "history" && panel.body !== panel.original);
    if (dirty && !window.confirm("Throw away what you’ve written here?")) return;
    if (panel?.kind === "post" && panel.form.photo.kind === "new") URL.revokeObjectURL(panel.form.photo.url);
    setNote(null);
    setPanel(next);
  }

  function discardAll() {
    writeEdits([]);
    setNote(null);
    requestAnimationFrame(paint);
  }

  async function exit(signOut: boolean) {
    saveDraft([]);
    editsRef.current = [];
    setEdits([]);
    if (signOut) await fetch("/api/edit/session", { method: "DELETE" }).catch(() => null);
    onClose();
  }

  /* ── Status line ── */

  const left = deploy ? Math.max(0, LIVE_SECONDS - Math.floor((now - deploy.startedAt) / 1000)) : 0;
  const status: Note | null =
    note ??
    (deploy?.state === "pending"
      ? {
          tone: "info",
          text: left
            ? `Published. Your changes will be on the live site in about ${clock(left)} — until then it still shows the old version.`
            : "Still updating the live site — almost there.",
        }
      : deploy?.state === "live"
        ? { tone: "good", text: "Your changes are live." }
        : deploy?.state === "failed"
          ? { tone: "bad", text: "Saved, but the live site didn’t rebuild. Let Eli know." }
          : missing.length
            ? { tone: "bad", text: `${plural(missing.length, "unpublished change")} on this page can’t be placed any more — Discard and make ${missing.length === 1 ? "it" : "them"} again.` }
            : null);

  /* ── Signed out: the sign-in box ── */

  if (email === null) {
    return sent ? (
      <Dialog title="Check your email">
        <p className="dfd-editor-copy dfd-editor-copy--spaced">
          We sent a sign-in link to <strong>{sent}</strong>. It works for 20 minutes.
        </p>
        <p className="dfd-editor-copy dfd-editor-copy--muted">
          Not in your inbox after a minute? Look in Spam and mark it “Not spam” so the next one comes straight through.
        </p>
        <div className="dfd-editor-actions dfd-editor-actions--spaced">
          <button type="button" onClick={() => setSent(null)} className="dfd-editor-link dfd-editor-link--accent">
            Use a different email
          </button>
          <button type="button" onClick={onClose} className="dfd-editor-link">
            Close
          </button>
        </div>
      </Dialog>
    ) : (
      <Dialog title="Edit the website">
        <form onSubmit={requestLink}>
          <p className="dfd-editor-copy">Enter your email and we’ll send you a link to sign in.</p>
          <label htmlFor="edit-email" className="dfd-editor-label">
            Email
          </label>
          <input
            id="edit-email"
            type="email"
            required
            autoFocus
            autoComplete="email"
            placeholder="you@example.com"
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            className={field}
          />
          <button type="submit" disabled={busy} className={`${solid} dfd-editor-btn--full`}>
            {busy ? "Sending…" : "Email me a sign-in link"}
          </button>
          <button type="button" onClick={onClose} className="dfd-editor-link dfd-editor-link--below">
            Close
          </button>
        </form>
        {note && <p className={`dfd-editor-note ${note.tone === "bad" ? "dfd-editor-note--bad" : ""}`}>{note.text}</p>}
      </Dialog>
    );
  }

  /* ── Signed in: the bar and its dialogs ── */

  return (
    <>
      <div
        role="region"
        aria-label="Website editor"
        className="dfd-editor-bar"
      >
        <div className="dfd-editor-bar-accent" aria-hidden="true" />
        <div className="dfd-editor-bar-inner">
          {email === undefined ? (
            <p>Loading the editor…</p>
          ) : (
            <>
              <div className="dfd-editor-bar-copy">
                <p className="dfd-editor-eyebrow">
                  {preview ? "Preview" : "Editing"}
                  {edits.length > 0 && <span className="dfd-editor-unsaved">{plural(edits.length, "unpublished change")}</span>}
                </p>
                <p className="dfd-editor-instruction">
                  {preview
                    ? "This is how the page reads. Links work; nothing is editable until you go back."
                    : scanning
                      ? "Finding the text you can change…"
                      : "Point at any text — it lights up gold — and click to change it."}
                </p>
              </div>
              <div className="dfd-editor-bar-actions">
                {!preview && (
                  <>
                    <button type="button" onClick={() => openBoard("events")} disabled={busy} className={onDark}>
                      Events
                    </button>
                    <button type="button" onClick={() => openBoard("notice")} disabled={busy} className={onDark}>
                      Notice
                    </button>
                    <button type="button" onClick={() => openContent("blog")} disabled={busy} className={onDark}>
                      Blog
                    </button>
                    <button type="button" onClick={() => openContent("history")} disabled={busy} className={onDark}>
                      History
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setPreview((p) => !p)} className={onDark}>
                  {preview ? "Back to editing" : "Preview"}
                </button>
                {edits.length > 0 && (
                  <>
                    <button type="button" onClick={discardAll} disabled={busy} className={onDark}>
                      Discard
                    </button>
                    <button type="button" onClick={() => setConfirm({ kind: "publish" })} disabled={busy} className={solid}>
                      Publish
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setConfirm({ kind: "exit" })} className={onDark}>
                  Exit
                </button>
              </div>
            </>
          )}
          {status && (
            <p
              aria-live="polite"
              className={`dfd-editor-status dfd-editor-status--${status.tone}`}
            >
              {status.text}
              {deploy?.state === "live" && !note && (
                <>
                  {" "}
                  <a
                    href={`${location.pathname}?fresh=${deploy.commit.slice(0, 7)}`}
                    target="_blank"
                    rel="noopener"
                    className="dfd-editor-status-link"
                  >
                    See it
                  </a>
                </>
              )}
            </p>
          )}
        </div>
      </div>

      {open && (
        <Dialog title="Change this text">
          <p className="dfd-editor-location">Saved in: {open.where}</p>
          <textarea
            autoFocus
            value={open.value}
            onChange={(e) => setOpen({ ...open, value: e.target.value })}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                saveText();
              }
            }}
            rows={Math.min(10, Math.max(2, Math.ceil(open.value.length / 48)))}
            className={`${field} dfd-editor-field--textarea`}
          />
          {open.text !== tidy(open.value) && (
            <p className="dfd-editor-before">
              Was: <span>{clip(open.text, 160)}</span>
            </p>
          )}
          {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={saveText} className={solid}>
              Done
            </button>
            <button type="button" onClick={() => setOpen(null)} className={outline}>
              Cancel
            </button>
            {edits.some((e) => e.path === location.pathname && e.text === open.text && e.context.join() === open.context.join()) && (
              <button type="button" onClick={undoText} className="dfd-editor-link dfd-editor-link--push">
                Put back the original
              </button>
            )}
          </div>
          <p className="dfd-editor-help">Nothing goes live until you press Publish in the bar.</p>
        </Dialog>
      )}

      {panel?.kind === "events" && board && (
        <Dialog title="Events" wide>
          <p className="dfd-editor-copy">
            Events show under “Coming up” in the service times. Each one comes off the website by itself after its last day.
          </p>
          {board.events.length ? (
            <ul className="dfd-editor-change-list">
              {board.events.map((ev) => (
                <li key={ev.id} className="dfd-editor-item">
                  <div className="dfd-editor-item-copy">
                    <p className="dfd-editor-item-title">{ev.title}</p>
                    <p className="dfd-editor-item-when">{eventWhen(ev)}</p>
                  </div>
                  <div className="dfd-editor-item-actions">
                    <button
                      type="button"
                      onClick={() =>
                        setPanel({
                          kind: "event",
                          form: {
                            replaceId: ev.id,
                            title: ev.title,
                            start: ev.start,
                            endsOn: ev.endsOn !== ev.start ? ev.endsOn : "",
                            time24: ev.time24 ?? "",
                            summary: ev.summary,
                          },
                        })
                      }
                      className="dfd-editor-link dfd-editor-link--accent"
                    >
                      Change
                    </button>
                    <button type="button" onClick={() => setPanel({ kind: "remove", ev })} className="dfd-editor-link">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dfd-editor-copy dfd-editor-copy--spaced dfd-editor-copy--muted">There are no events on the website right now.</p>
          )}
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={() => setPanel({ kind: "event", form: BLANK_EVENT })} className={solid}>
              Add an event
            </button>
            <button type="button" onClick={() => setPanel(null)} className={outline}>
              Close
            </button>
          </div>
        </Dialog>
      )}

      {panel?.kind === "event" && (
        <Dialog title={panel.form.replaceId ? "Change this event" : "Add an event"} wide>
          <form onSubmit={saveEvent}>
            <label htmlFor="ev-title" className="dfd-editor-label">
              What’s happening
            </label>
            <input
              id="ev-title"
              required
              autoFocus
              maxLength={100}
              placeholder="Trunk or Treat"
              value={panel.form.title}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, title: e.target.value } })}
              className={field}
            />
            <div className="dfd-editor-row">
              <div>
                <label htmlFor="ev-start" className="dfd-editor-label">
                  Day
                </label>
                <input
                  id="ev-start"
                  type="date"
                  required
                  min={churchToday()}
                  value={panel.form.start}
                  onChange={(e) => setPanel({ ...panel, form: { ...panel.form, start: e.target.value } })}
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="ev-time" className="dfd-editor-label">
                  Time<span className="dfd-editor-optional">optional</span>
                </label>
                <input
                  id="ev-time"
                  type="time"
                  value={panel.form.time24}
                  onChange={(e) => setPanel({ ...panel, form: { ...panel.form, time24: e.target.value } })}
                  className={field}
                />
              </div>
            </div>
            <label htmlFor="ev-end" className="dfd-editor-label">
              Last day<span className="dfd-editor-optional">only if it runs more than one day</span>
            </label>
            <input
              id="ev-end"
              type="date"
              min={panel.form.start || churchToday()}
              value={panel.form.endsOn}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, endsOn: e.target.value } })}
              className={field}
            />
            <label htmlFor="ev-summary" className="dfd-editor-label">
              A line about it<span className="dfd-editor-optional">optional</span>
            </label>
            <textarea
              id="ev-summary"
              rows={3}
              maxLength={400}
              placeholder="Candy for the kids in the church parking lot. Everybody welcome."
              value={panel.form.summary}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, summary: e.target.value } })}
              className={field}
            />
            {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
            <div className="dfd-editor-actions dfd-editor-actions--spaced">
              <button type="submit" disabled={busy} className={solid}>
                {busy ? "Saving…" : panel.form.replaceId ? "Save and publish" : "Add to the website"}
              </button>
              <button type="button" onClick={() => openBoard("events")} disabled={busy} className={outline}>
                Back
              </button>
            </div>
            <p className="dfd-editor-help">It shows on the live website about 2 minutes after you save.</p>
          </form>
        </Dialog>
      )}

      {panel?.kind === "remove" && (
        <Dialog title={`Remove ${panel.ev.title}?`}>
          <p className="dfd-editor-copy dfd-editor-copy--spaced">
            It comes off the website in about 2 minutes. ({eventWhen(panel.ev)})
          </p>
          {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={() => sendBoard("DELETE", { id: panel.ev.id })} disabled={busy} className={solid}>
              {busy ? "Removing…" : "Yes, remove it"}
            </button>
            <button type="button" onClick={() => setPanel({ kind: "events" })} disabled={busy} className={outline}>
              Keep it
            </button>
          </div>
        </Dialog>
      )}

      {panel?.kind === "notice" && board && (
        <Dialog title="Notice at the top of the page">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendBoard("POST", { notice: { text: panel.text, until: panel.until } });
            }}
          >
            <p className="dfd-editor-copy">One line across the very top of the website, for something everyone should see.</p>
            <label htmlFor="notice-text" className="dfd-editor-label">
              Notice
            </label>
            <textarea
              id="notice-text"
              required
              autoFocus
              rows={2}
              maxLength={200}
              placeholder="Trunk or Treat this Saturday at 6 pm in the church parking lot!"
              value={panel.text}
              onChange={(e) => setPanel({ ...panel, text: e.target.value })}
              className={field}
            />
            <label htmlFor="notice-until" className="dfd-editor-label">
              Take it down after<span className="dfd-editor-optional">optional</span>
            </label>
            <input
              id="notice-until"
              type="date"
              min={churchToday()}
              value={panel.until}
              onChange={(e) => setPanel({ ...panel, until: e.target.value })}
              className={field}
            />
            {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
            <div className="dfd-editor-actions dfd-editor-actions--spaced">
              <button type="submit" disabled={busy} className={solid}>
                {busy ? "Saving…" : board.notice.text ? "Save and publish" : "Put it up"}
              </button>
              <button type="button" onClick={() => setPanel(null)} disabled={busy} className={outline}>
                Cancel
              </button>
              {board.notice.text && (
                <button
                  type="button"
                  onClick={() => sendBoard("POST", { notice: { text: "", until: "" } })}
                  disabled={busy}
                  className="dfd-editor-link dfd-editor-link--push"
                >
                  Take the notice down
                </button>
              )}
            </div>
            <p className="dfd-editor-help">It shows on the live website about 2 minutes after you save.</p>
          </form>
        </Dialog>
      )}

      {panel?.kind === "blog" && (
        <Dialog title="Blog" wide>
          <p className="dfd-editor-copy">
            Articles show on the Blog page, newest first. Each one gets its own page.
          </p>
          {panel.posts.length ? (
            <ul className="dfd-editor-change-list">
              {panel.posts.map((post) => (
                <li key={post.slug} className="dfd-editor-item">
                  <div className="dfd-editor-item-copy">
                    <p className="dfd-editor-item-title">{post.title}</p>
                    <p className="dfd-editor-item-when">
                      {dayName(post.date)}
                      {post.photo ? " · with a photo" : ""}
                    </p>
                  </div>
                  <div className="dfd-editor-item-actions">
                    <a href={`/blog/${post.slug}`} target="_blank" rel="noopener" className="dfd-editor-link">
                      View
                    </a>
                    <button type="button" onClick={() => editPost(post)} className="dfd-editor-link dfd-editor-link--accent">
                      Change
                    </button>
                    <button type="button" onClick={() => setPanel({ kind: "removePost", post })} className="dfd-editor-link">
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="dfd-editor-copy dfd-editor-copy--spaced dfd-editor-copy--muted">There are no articles yet.</p>
          )}
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={() => editPost()} className={solid}>
              Write an article
            </button>
            <button type="button" onClick={() => setPanel(null)} className={outline}>
              Close
            </button>
          </div>
        </Dialog>
      )}

      {panel?.kind === "post" && (
        <Dialog title={panel.form.slug ? "Change this article" : "Write an article"} wide>
          <form onSubmit={savePost}>
            <label htmlFor="post-title" className="dfd-editor-label">
              Title
            </label>
            <input
              id="post-title"
              required
              autoFocus
              maxLength={140}
              value={panel.form.title}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, title: e.target.value } })}
              className={field}
            />
            <label htmlFor="post-date" className="dfd-editor-label">
              Date
            </label>
            <input
              id="post-date"
              type="date"
              required
              value={panel.form.date}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, date: e.target.value } })}
              className={field}
            />
            <label htmlFor="post-body" className="dfd-editor-label">
              The article<span className="dfd-editor-optional">leave a blank line between paragraphs</span>
            </label>
            <textarea
              id="post-body"
              required
              rows={12}
              maxLength={30000}
              value={panel.form.body}
              onChange={(e) => setPanel({ ...panel, form: { ...panel.form, body: e.target.value } })}
              className={`${field} dfd-editor-field--long`}
            />
            <span className="dfd-editor-label">
              Photo<span className="dfd-editor-optional">optional</span>
            </span>
            {panel.form.photo.kind !== "none" && (
              <div className="dfd-editor-photo">
                <img src={panel.form.photo.kind === "keep" ? panel.form.photo.src : panel.form.photo.url} alt="The article’s photo" />
                <button
                  type="button"
                  onClick={() => {
                    if (panel.form.photo.kind === "new") URL.revokeObjectURL(panel.form.photo.url);
                    setPanel({ ...panel, form: { ...panel.form, photo: { kind: "none" } } });
                  }}
                  className="dfd-editor-link"
                >
                  Take the photo off
                </button>
              </div>
            )}
            <label className={`${outline} dfd-editor-file`}>
              {panel.form.photo.kind === "none" ? "Choose a photo" : "Use a different photo"}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  choosePhoto(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
            <div className="dfd-editor-actions dfd-editor-actions--spaced">
              <button type="submit" disabled={busy} className={solid}>
                {busy ? "Saving…" : panel.form.slug ? "Save and publish" : "Publish the article"}
              </button>
              <button type="button" onClick={() => leaveForm(null)} disabled={busy} className={outline}>
                Cancel
              </button>
            </div>
            <p className="dfd-editor-help">It shows on the live website about 2 minutes after you save.</p>
          </form>
        </Dialog>
      )}

      {panel?.kind === "removePost" && (
        <Dialog title={`Remove “${panel.post.title}”?`}>
          <p className="dfd-editor-copy dfd-editor-copy--spaced">
            The article and its page come off the website in about 2 minutes. This can’t be undone from here.
          </p>
          {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={() => sendBoard("DELETE", { slug: panel.post.slug }, "/api/edit/blog")} disabled={busy} className={solid}>
              {busy ? "Removing…" : "Yes, remove it"}
            </button>
            <button type="button" onClick={() => openContent("blog")} disabled={busy} className={outline}>
              Keep it
            </button>
          </div>
        </Dialog>
      )}

      {panel?.kind === "history" && (
        <Dialog title="The history page" wide>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendBoard("POST", { body: panel.body }, "/api/edit/history");
            }}
          >
            <p className="dfd-editor-copy">
              Everything on the History page. Leave a blank line between paragraphs.{" "}
              <a href="/history" target="_blank" rel="noopener" className="dfd-editor-link dfd-editor-link--accent">
                See the page
              </a>
            </p>
            <textarea
              aria-label="The history page"
              required
              autoFocus
              rows={14}
              maxLength={30000}
              value={panel.body}
              onChange={(e) => setPanel({ ...panel, body: e.target.value })}
              className={`${field} dfd-editor-field--textarea dfd-editor-field--long`}
            />
            {note?.tone === "bad" && <p className="dfd-editor-note dfd-editor-note--bad">{note.text}</p>}
            <div className="dfd-editor-actions dfd-editor-actions--spaced">
              <button type="submit" disabled={busy || panel.body === panel.original} className={solid}>
                {busy ? "Saving…" : "Save and publish"}
              </button>
              <button type="button" onClick={() => leaveForm(null)} disabled={busy} className={outline}>
                Cancel
              </button>
            </div>
            <p className="dfd-editor-help">It shows on the live website about 2 minutes after you save.</p>
          </form>
        </Dialog>
      )}

      {confirm?.kind === "publish" && (
        <Dialog title={`Publish ${plural(edits.length, "change")}?`} wide>
          {confirm.problems && (
            <p className="dfd-editor-alert dfd-editor-alert--bad">
              Nothing was published. The changes marked below can’t be saved any more — remove them with ✕, then publish the rest.
            </p>
          )}
          <ul className="dfd-editor-change-list">
            {edits.map((e) => {
              const problem = confirm.problems?.[keyOf(e.path, e.text, e.context)];
              return (
                <li key={keyOf(e.path, e.text, e.context)} className="dfd-editor-change">
                  <div className="dfd-editor-change-copy">
                    <p className="dfd-editor-change-old">{clip(e.text)}</p>
                    <p className="dfd-editor-change-new">{clip(e.to)}</p>
                    <p className="dfd-editor-change-where">
                      {e.where} · {pagePath(e.path)}
                    </p>
                    {problem && <p className="dfd-editor-change-problem">{problem}</p>}
                  </div>
                  <button
                    type="button"
                    aria-label="Remove this change"
                    onClick={() => {
                      const next = edits.filter((x) => x !== e);
                      writeEdits(next);
                      requestAnimationFrame(paint);
                      if (!next.length) setConfirm(null);
                    }}
                    className="dfd-editor-remove"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="dfd-editor-alert dfd-editor-alert--wait">
            <strong>Give it about 2 minutes.</strong> The live site rebuilds after you publish. Until it finishes, the
            website — for visitors and for you — still shows the old wording. The bar counts down and tells you when it’s live.
          </p>
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={publish} disabled={busy || !edits.length} className={solid}>
              {busy ? "Publishing…" : "Publish"}
            </button>
            <button type="button" onClick={() => setConfirm(null)} disabled={busy} className={outline}>
              Cancel
            </button>
          </div>
        </Dialog>
      )}

      {confirm?.kind === "exit" && (
        <Dialog title="Exit the editor?">
          {edits.length > 0 && (
            <p className="dfd-editor-copy dfd-editor-copy--spaced">
              You have {plural(edits.length, "unpublished change")}. Exiting throws {edits.length === 1 ? "it" : "them"} away.
            </p>
          )}
          {deploy?.state === "pending" && (
            <p className="dfd-editor-copy dfd-editor-copy--spaced">
              Your last publish is still going live{left ? ` — about ${clock(left)} left` : ""}. If you exit now, the site may show the old version until
              then; refresh after that.
            </p>
          )}
          <p className="dfd-editor-copy dfd-editor-copy--muted">
            Exiting clears the editor from this browser and reloads the page fresh, the way visitors see it. You stay signed in, so /edit brings you
            straight back.
          </p>
          <div className="dfd-editor-actions dfd-editor-actions--spaced">
            <button type="button" onClick={() => exit(false)} className={solid}>
              Exit and clear
            </button>
            <button type="button" onClick={() => setConfirm(null)} className={outline}>
              Keep editing
            </button>
          </div>
          <button type="button" onClick={() => exit(true)} className="dfd-editor-link dfd-editor-link--below">
            Exit and sign out
          </button>
        </Dialog>
      )}
    </>
  );
}
