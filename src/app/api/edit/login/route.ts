import { EDITOR } from "@/edit/config";
import { LINK_MINUTES, canEdit, editorEmails, linkToken, sameOrigin } from "@/edit/auth";
import { PUBLIC_SITE, canSignInFrom, requestOrigin } from "@/edit/hosts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Best-effort per-instance limit: 5 links / 15 min per IP and per address.
const hits = new Map<string, number[]>();
function limited(key: string) {
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < 15 * 60 * 1000);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > 5;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

/** Emails a sign-in link — only to an address in EDIT_EMAILS, only from the real site. */
export async function POST(req: Request) {
  const host = req.headers.get("host");
  if (!canSignInFrom(host) || !sameOrigin(req)) return Response.json({ error: "Not available here." }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { email?: unknown };
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 200) : "";
  if (!email) return Response.json({ error: "Enter your email address." }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (limited(`ip:${ip}`) || limited(`e:${email}`)) {
    return Response.json({ error: "Too many sign-in emails. Wait a few minutes and try again." }, { status: 429 });
  }

  if (!editorEmails().length || !process.env.EDIT_SECRET) {
    return Response.json({ error: "Editing isn’t switched on for this site yet." }, { status: 503 });
  }
  // The owner's address is printed on the site, so saying "not this one" gives nothing away.
  if (!canEdit(email)) return Response.json({ error: "That email isn’t set up to edit this site." }, { status: 403 });

  // Its own variable: the prayer-request form treats RESEND_API_KEY as "email
  // the pastor", and that address isn't set up to send sign-in links.
  const key = process.env.EDIT_RESEND_API_KEY;
  // Sent as a person on the sending domain. A church name on an elijahdesent.com
  // address, with one button to another domain, reads as phishing to Gmail.
  const from = process.env.EDIT_FROM_EMAIL ?? "Eli Desent <noreply@dfd.llc>";
  if (!key || !from) return Response.json({ error: "Sign-in email isn’t configured yet." }, { status: 503 });

  const link = `${requestOrigin(req)}/api/edit/verify?t=${linkToken(email)}`;
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `Edit the ${EDITOR.siteShortName} website`,
      text: `Hi,\n\nHere is your link to edit the ${EDITOR.siteName} website. It opens the editor at ${PUBLIC_SITE}/edit:\n\n${link}\n\nThe link works for ${LINK_MINUTES} minutes. It was requested from the editor just now; if that wasn't you, you can ignore this email.\n\nEli Desent\nDigital Front Door\ndfd.llc`,
      html: `<div style="font:16px/1.55 system-ui,-apple-system,Segoe UI,sans-serif;color:#222;max-width:520px">
<p>Hi,</p>
<p>Here is your link to edit the ${esc(EDITOR.siteName)} website. It opens the editor at <b>${esc(PUBLIC_SITE)}/edit</b>.</p>
<p style="margin:26px 0"><a href="${esc(link)}" style="display:inline-block;background:${esc(EDITOR.accent)};color:#fff;padding:14px 22px;font-weight:700;text-decoration:none">Open the editor</a></p>
<p style="font-size:14px;color:#555">The link works for ${LINK_MINUTES} minutes. It was requested from the editor just now; if that wasn't you, you can ignore this email.</p>
<p style="margin-top:28px">Eli Desent<br><span style="color:#777">Digital Front Door · dfd.llc</span></p>
</div>`,
    }),
  }).catch(() => null);

  if (!r?.ok) {
    console.error("edit login email", r?.status, await r?.text().catch(() => ""));
    return Response.json({ error: "The sign-in email didn’t send. Try again in a minute." }, { status: 502 });
  }
  return Response.json({ ok: true, minutes: LINK_MINUTES });
}
