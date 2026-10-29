/**
 * The editor's only way to change the site: commits to the repo through the
 * GitHub API. Vercel deploys main on every commit, so a commit is a publish.
 */

const REPO = process.env.EDIT_REPO ?? "edesent/flatgapbaptist";
const BRANCH = process.env.EDIT_BRANCH ?? "main";

async function gh(path: string, init: RequestInit = {}) {
  const token = process.env.EDIT_GITHUB_TOKEN;
  if (!token) throw new Error("EDIT_GITHUB_TOKEN is not set.");
  return fetch(`https://api.github.com/repos/${REPO}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "flatgapbaptist-site-editor",
      ...init.headers,
    },
  });
}

async function json<T>(r: Response, what: string): Promise<T> {
  if (!r.ok) throw new Error(`GitHub ${what} failed (${r.status}): ${(await r.text()).slice(0, 300)}`);
  return (await r.json()) as T;
}

export type Snapshot = {
  commit: string;
  /** Every file path in the repo at that commit, with its blob sha. */
  paths: Map<string, string>;
  /** Text of the source files the editor may change (see SOURCE). */
  files: Map<string, string>;
};

/** Files whose words appear on the site. The editor's own code is left alone. */
const SOURCE = /^src\/(?!edit\/|app\/api\/).+\.(ts|tsx)$/;

/** The branch as it is right now: what text edits are matched against. */
export async function snapshot({ withFiles = true } = {}): Promise<Snapshot> {
  const ref = await json<{ object: { sha: string } }>(await gh(`/git/ref/heads/${BRANCH}`), "ref read");
  const commit = ref.object.sha;
  const tree = await json<{ tree: { path: string; type: string; sha: string }[]; truncated: boolean }>(
    await gh(`/git/trees/${commit}?recursive=1`),
    "tree read",
  );
  if (tree.truncated) throw new Error("Repo tree too large to read in one request.");
  const paths = new Map(tree.tree.filter((t) => t.type === "blob").map((t) => [t.path, t.sha]));
  const wanted = withFiles ? [...paths].filter(([p]) => SOURCE.test(p)) : [];
  const files = new Map<string, string>();
  await Promise.all(
    wanted.map(async ([p, sha]) => {
      const b = await json<{ content: string }>(await gh(`/git/blobs/${sha}`), `read ${p}`);
      files.set(p, Buffer.from(b.content, "base64").toString("utf8"));
    }),
  );
  return { commit, paths, files };
}

let cache: { at: number; snap: Promise<Snapshot> } | null = null;

/**
 * For marking what's editable as pages load: a snapshot up to a minute old is
 * fine there. Publishing always reads the branch fresh.
 */
export function recentSnapshot() {
  if (!cache || Date.now() - cache.at > 60_000) {
    const snap = snapshot();
    cache = { at: Date.now(), snap };
    snap.catch(() => (cache = null));
  }
  return cache.snap;
}

/** Store a file's bytes on GitHub ahead of the commit that uses them. */
export async function createBlob(bytes: Buffer) {
  const r = await gh(`/git/blobs`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ content: bytes.toString("base64"), encoding: "base64" }),
  });
  return (await json<{ sha: string }>(r, "blob upload")).sha;
}

export type FileChange = { path: string } & ({ content: string } | { sha: string } | { remove: true });

/**
 * One commit on top of `parent` that writes these files. Returns null when the
 * branch moved since `parent` was read — read again and retry.
 */
export async function commitFiles(parent: string, changes: FileChange[], message: string) {
  const tree = await json<{ sha: string }>(
    await gh(`/git/trees`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        base_tree: parent,
        tree: changes.map((c) =>
          "content" in c
            ? { path: c.path, mode: "100644", type: "blob", content: c.content }
            : "sha" in c
              ? { path: c.path, mode: "100644", type: "blob", sha: c.sha }
              : { path: c.path, mode: "100644", type: "blob", sha: null },
        ),
      }),
    }),
    "tree write",
  );
  const commit = await json<{ sha: string; html_url: string }>(
    await gh(`/git/commits`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message, tree: tree.sha, parents: [parent] }),
    }),
    "commit",
  );
  const moved = await gh(`/git/refs/heads/${BRANCH}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (moved.status === 422 || moved.status === 409) return null;
  await json(moved, "branch update");
  cache = null; // the next page scan should see what was just committed
  return { commit: commit.sha, url: commit.html_url };
}

/** Text of one file at the current branch tip (for files outside SOURCE). */
export async function readFile(path: string, snap: Snapshot) {
  const sha = snap.paths.get(path);
  if (!sha) return null;
  const b = await json<{ content: string }>(await gh(`/git/blobs/${sha}`), `read ${path}`);
  return Buffer.from(b.content, "base64").toString("utf8");
}

/** Vercel reports each commit's deploy back to GitHub as the "Vercel" status. */
export async function deployState(commit: string): Promise<"pending" | "live" | "failed"> {
  const r = await gh(`/commits/${commit}/status`);
  if (!r.ok) return "pending";
  const j = (await r.json()) as { statuses: { context: string; state: string }[] };
  const s = j.statuses.find((x) => x.context === "Vercel")?.state;
  return s === "success" ? "live" : s === "failure" || s === "error" ? "failed" : "pending";
}
