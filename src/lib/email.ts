import { Resend } from "resend";

// ── Where messages go ─────────────────────────────────────────────────────────
// CHURCH_INBOX receives every form submission. Pastor Eric asked for prayer
// requests by email, not text (his email of October 29, 2026). SENDER uses the
// dfd.llc domain, already verified in Resend for the site editor's login
// emails, reusing EDIT_RESEND_API_KEY below — resend.dev's shared sandbox
// domain only delivers to the Resend account owner, not arbitrary recipients
// like Eric, so it can't be used here.
export const CHURCH_INBOX = "lauterw@foothills.net";
export const SENDER = "Flat Gap Baptist Church Website <noreply@dfd.llc>";

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

type SendResult = { ok: true } | { ok: false; status: number; error: string };

/** Send an email via Resend to an arbitrary recipient. */
export async function sendEmail(opts: {
  to: string;
  from?: string;
  subject: string;
  replyTo?: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error("RESEND_API_KEY is not set.");
    return { ok: false, status: 500, error: "The form isn't configured yet." };
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: opts.from ?? SENDER,
    to: opts.to,
    replyTo: opts.replyTo,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  if (error) {
    console.error("Resend error:", error);
    return {
      ok: false,
      status: 502,
      error: "Sorry, the message couldn't be sent. Please try again.",
    };
  }

  return { ok: true };
}

/** Send a form submission to the church inbox via Resend. */
export async function sendChurchEmail(opts: {
  subject: string;
  replyTo?: string;
  text: string;
  html: string;
}): Promise<SendResult> {
  return sendEmail({ to: CHURCH_INBOX, from: SENDER, ...opts });
}
