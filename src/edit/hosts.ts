import { EDITOR } from "./config";

/** The editor lives at /edit on the public site and approved demo hosts. */
export const SIGN_IN_HOSTS: readonly string[] = EDITOR.hosts;

/** Where published changes show up — named in the editor's "it's live" message. */
export const PUBLIC_SITE = EDITOR.publicSite;

export function canSignInFrom(host: string | null | undefined) {
  return Boolean(host) && SIGN_IN_HOSTS.includes(host!.toLowerCase().split(":")[0]);
}

/**
 * The origin the browser used. `req.url` carries the server's own hostname
 * under `next start`, which would send the sign-in cookie and the redirect
 * to different hosts.
 */
export function requestOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || new URL(req.url).protocol.replace(":", "");
  return `${proto}://${req.headers.get("host")}`;
}
