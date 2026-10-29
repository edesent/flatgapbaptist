/**
 * Finds the one place in the source that a piece of on-page text comes from,
 * so a phrase changed by clicking the page can be written back into the right
 * file. Text is matched whole: JSX text between tags, or an entire string
 * literal (a value in site.ts, a prop like title="…"). Anything else — part of
 * a longer string, a comment, alt text, page metadata, text built by code —
 * is not offered for editing.
 */

/** JSX text, a JS string in each quote style, or a JSX attribute string. */
export type Kind = "jsx" | "attr" | '"' | "'" | "`";
export type Spot = { file: string; start: number; end: number; kind: Kind };
export type Found = { ok: true; spot: Spot } | { ok: false; reason: "missing" | "repeated"; count: number };

export const tidy = (s: string) => s.replace(/\s+/g, " ").trim();

const lit = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** Ways a character can be written in source and still render as itself. */
const SPELLINGS: Record<string, string[]> = {
  "’": ["’", "&rsquo;", "&#8217;", "\\u2019"],
  "‘": ["‘", "&lsquo;", "&#8216;", "\\u2018"],
  "“": ["“", "&ldquo;", "&#8220;", "\\u201c", "\\u201C"],
  "”": ["”", "&rdquo;", "&#8221;", "\\u201d", "\\u201D"],
  "—": ["—", "&mdash;", "&#8212;", "\\u2014"],
  "–": ["–", "&ndash;", "&#8211;", "\\u2013"],
  "…": ["…", "&hellip;", "\\u2026"],
  "·": ["·", "&middot;", "\\u00b7"],
  "©": ["©", "&copy;"],
  "&": ["&", "&amp;"],
  "'": ["'", "&apos;", "&#39;", "\\'"],
  '"': ['"', "&quot;", '\\"'],
  "<": ["<", "&lt;"],
  ">": [">", "&gt;"],
};
const SPACE = "(?:\\s|&nbsp;|&#160;|\\\\u00a0)+";

function pattern(text: string) {
  const words = tidy(text).split(" ").map((w) =>
    [...w].map((c) => (SPELLINGS[c] ? `(?:${SPELLINGS[c].map(lit).join("|")})` : lit(c))).join(""),
  );
  return new RegExp(words.join(SPACE), "g");
}

/** Attributes that never hold visible page text. */
const NOT_TEXT = /\b(?:alt|href|src|className|rel|target|sizes|id|type|name|role|key|width|height|aria-[a-z]+|data-[a-z-]+)=$/;

function classify(src: string, start: number, end: number): Kind | null {
  const open = src[start - 1];
  if ((open === '"' || open === "'" || open === "`") && src[end] === open && src[start - 2] !== "\\") {
    const lead = src.slice(Math.max(0, start - 60), start - 1);
    if (NOT_TEXT.test(lead) || /\b(?:from|import|require\(|import\()\s*$/.test(lead)) return null;
    if (open !== "`" && /[A-Za-z_][\w-]*=$/.test(lead)) return "attr";
    return open;
  }
  // JSX text: only whitespace between the match and the tag or brace around it.
  let i = start - 1;
  while (i >= 0 && /\s/.test(src[i])) i--;
  let j = end;
  while (j < src.length && /\s/.test(src[j])) j++;
  const before = src[i];
  const after = src[j];
  if ((before === ">" && src[i - 1] !== "=") || before === "}") {
    if (after === "<" || after === "{") return "jsx";
  }
  return null;
}

/** Character ranges of `export const metadata = {…}` and generateMetadata — search text, not page text. */
function metadataRanges(src: string): [number, number][] {
  const out: [number, number][] = [];
  const re = /export\s+(?:const\s+metadata\b|async\s+function\s+generateMetadata\b|function\s+generateMetadata\b)/g;
  for (let m; (m = re.exec(src)); ) {
    // The body starts at the first brace after `=` (the object) or after the parameter list (the function).
    let from = src.indexOf("=", m.index);
    if (m[0].includes("generateMetadata")) {
      let depth = 0;
      for (from = src.indexOf("(", m.index); from < src.length; from++) {
        if (src[from] === "(") depth++;
        else if (src[from] === ")" && --depth === 0) break;
      }
    }
    const open = src.indexOf("{", from);
    if (open < 0) continue;
    let depth = 0;
    for (let k = open; k < src.length; k++) {
      if (src[k] === "{") depth++;
      else if (src[k] === "}" && --depth === 0) {
        out.push([m.index, k + 1]);
        break;
      }
    }
  }
  return out;
}

/** A word that must appear literally in any file holding the text — a cheap first filter. */
function anchor(text: string) {
  return (text.match(/[A-Za-z0-9]{3,}/g) ?? []).sort((a, b) => b.length - a.length)[0];
}

const IMPORT = /(?:import|export)\s[^;]*?from\s*["']([^"']+)["']|import\(\s*["']([^"']+)["']\s*\)/g;

/** Every source file reachable by imports from `entries` — what can render on that page. */
export function reachable(files: Map<string, string>, entries: string[]) {
  const seen = new Set<string>();
  const queue = entries.filter((e) => files.has(e));
  while (queue.length) {
    const file = queue.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    const dir = file.split("/").slice(0, -1).join("/");
    for (const m of files.get(file)!.matchAll(IMPORT)) {
      const spec = m[1] ?? m[2];
      let base: string;
      if (spec.startsWith("@/")) base = `src/${spec.slice(2)}`;
      else if (spec.startsWith(".")) base = normalise(`${dir}/${spec}`);
      else continue;
      const hit = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((c) => files.has(c));
      if (hit && !seen.has(hit)) queue.push(hit);
    }
  }
  return seen;
}

function normalise(p: string) {
  const out: string[] = [];
  for (const part of p.split("/")) {
    if (part === "..") out.pop();
    else if (part && part !== ".") out.push(part);
  }
  return out.join("/");
}

/** The page file(s) for a URL path, including dynamic routes like ministries/[slug]. */
export function routeFiles(pathname: string, files: Iterable<string>) {
  const segs = pathname.replace(/^\/|\/$/g, "").split("/").filter(Boolean);
  if (!segs.length || (segs.length === 1 && segs[0] === "edit")) return ["src/app/page.tsx"];
  const re = new RegExp(`^src/app/${segs.map((s) => `(?:${lit(s)}|\\[[^/]+\\])`).join("/")}/page\\.tsx$`);
  return [...files].filter((f) => re.test(f));
}

/**
 * Several places hold the same words ("6:00 pm" is two services in site.ts).
 * The page knows what sits next to the clicked text — "Evening Bible Hour" —
 * so pick the candidate with that nearby text closest to it in the source.
 */
function byContext(spots: Spot[], files: Map<string, string>, context: string[]) {
  const RANGE = 600;
  // Nearest neighbours first; the closer one is on the page, the more it counts.
  const pats = context.map(tidy).filter((c) => /[A-Za-z0-9]/.test(c)).slice(0, 8).map(pattern);
  if (!pats.length) return null;
  const scored = spots.map((spot) => {
    const src = files.get(spot.file)!;
    const from = Math.max(0, spot.start - RANGE);
    const window = src.slice(from, spot.end + RANGE);
    let score = 0;
    for (const [k, re] of pats.entries()) {
      let best = Infinity;
      re.lastIndex = 0;
      for (let m; (m = re.exec(window)); ) {
        const at = from + m.index;
        if (at >= spot.start && at < spot.end) continue;
        best = Math.min(best, Math.abs(at - spot.start));
      }
      if (best <= RANGE) score += (RANGE - best) / (k + 1);
    }
    return { spot, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const [first, second] = scored;
  const runnerUp = second?.score ?? 0;
  // A clear winner or nothing: editing the wrong copy is worse than not offering it.
  return first.score > 0 && first.score - runnerUp > 120 && first.score > runnerUp * 1.3 ? first.spot : null;
}

export function locate(files: Map<string, string>, text: string, local: string[], context: string[] = []): Found {
  const clean = tidy(text);
  if (!clean) return { ok: false, reason: "missing", count: 0 };
  // Only files this page imports (directly or not) can have put the text there.
  const renderable = local.length ? reachable(files, local) : null;
  const re = pattern(clean);
  const hint = anchor(clean);
  const spots: Spot[] = [];
  for (const [file, src] of files) {
    if (hint && !src.includes(hint)) continue;
    if (renderable && !renderable.has(file)) continue;
    const skip = metadataRanges(src);
    re.lastIndex = 0;
    for (let m; (m = re.exec(src)); ) {
      const start = m.index;
      const end = start + m[0].length;
      if (skip.some(([a, b]) => start >= a && end <= b)) continue;
      const kind = classify(src, start, end);
      if (kind) spots.push({ file, start, end, kind });
    }
  }
  if (spots.length === 1) return { ok: true, spot: spots[0] };
  if (!spots.length) return { ok: false, reason: "missing", count: 0 };
  // The same words in several places: the page being edited wins if it has exactly one,
  // then whichever spot has the clicked text's neighbours closest to it.
  const here = spots.filter((s) => local.includes(s.file));
  if (here.length === 1) return { ok: true, spot: here[0] };
  const near = byContext(spots, files, context);
  if (near) return { ok: true, spot: near };
  return { ok: false, reason: "repeated", count: spots.length };
}

/** The new text, written so it means the same thing where it's going. */
export function encode(kind: Kind, text: string) {
  const entityLike = /&(?=[a-zA-Z#][a-zA-Z0-9]*;)/g;
  switch (kind) {
    case "jsx":
      return text
        .replace(entityLike, "&amp;")
        .replace(/[{}<>]/g, (c) => ({ "{": "&#123;", "}": "&#125;", "<": "&lt;", ">": "&gt;" })[c]!);
    case "attr":
      return text.replace(entityLike, "&amp;").replace(/"/g, "&quot;");
    case "`":
      return text.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
    default:
      return text.replace(/\\/g, "\\\\").split(kind).join(`\\${kind}`);
  }
}

/** Where a file's text shows up, in words a pastor would use. */
export function describe(file: string) {
  const known: Record<string, string> = {
    "src/config/site.ts": "Church details — used on several pages",
    "src/components/Hero.tsx": "Home page banner",
    "src/content/ministries.ts": "Ministries",
    "src/content/articles-of-faith.ts": "Articles of faith",
    "src/app/page.tsx": "Home page",
    "src/app/ministries/[slug]/page.tsx": "Ministry pages",
  };
  if (known[file]) return known[file];
  const page = file.match(/^src\/app\/([^[]+)\/page\.tsx$/)?.[1];
  if (page) {
    const words = page.split("/").pop()!.replace(/-/g, " ");
    return `${words.charAt(0).toUpperCase()}${words.slice(1)} page`;
  }
  return "Shared page parts";
}
