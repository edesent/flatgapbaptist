import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { EDITOR } from "./config";

/**
 * Email sign-in for the text editor, with no database: the link in the email
 * and the session cookie are both HMAC-signed with EDIT_SECRET. Only addresses
 * in EDIT_EMAILS (comma separated) can get a link, and a session stops working
 * the moment its address is taken out of that list.
 */

export const SESSION_COOKIE = EDITOR.cookieName;
/** Only the editor's API reads the session, so the cookie never rides along on page requests. */
export const SESSION_PATH = "/api/edit";
export const LINK_MINUTES = 20;
export const SESSION_DAYS = 30;

type Claims = { e: string; x: number; p: "link" | "session" };

const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");

function secret() {
  const s = process.env.EDIT_SECRET;
  if (!s || s.length < 32) throw new Error("EDIT_SECRET is not set (32+ characters).");
  return s;
}

export function editorEmails() {
  return (process.env.EDIT_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export const canEdit = (email: string) => editorEmails().includes(email.trim().toLowerCase());

function sign(claims: Claims) {
  const body = b64(JSON.stringify(claims));
  return `${body}.${b64(createHmac("sha256", secret()).update(body).digest())}`;
}

function verify(token: string | undefined, purpose: Claims["p"]): string | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;
  const want = createHmac("sha256", secret()).update(body).digest();
  const got = Buffer.from(mac, "base64url");
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try {
    const c = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Claims;
    if (c.p !== purpose || typeof c.e !== "string" || c.x < Date.now() || !canEdit(c.e)) return null;
    return c.e;
  } catch {
    return null;
  }
}

export const linkToken = (email: string) =>
  sign({ e: email.trim().toLowerCase(), x: Date.now() + LINK_MINUTES * 60_000, p: "link" });

export const emailFromLink = (token: string | undefined) => verify(token, "link");

export const sessionToken = (email: string) =>
  sign({ e: email, x: Date.now() + SESSION_DAYS * 86_400_000, p: "session" });

/** The signed-in editor's email for this request, or null. */
export async function sessionEmail() {
  return verify((await cookies()).get(SESSION_COOKIE)?.value, "session");
}

/**
 * Writes must come from a page on the same edit host. Together with the
 * SameSite=Lax cookie this keeps another site from posting edits.
 */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
