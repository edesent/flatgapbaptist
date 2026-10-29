import { escapeHtml, sendChurchEmail } from "@/lib/email";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // Honeypot — bots fill this; real visitors never see it. Pretend success.
  if (body.botcheck) {
    return Response.json({ success: true });
  }

  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const request_text = String(body.request ?? "").trim();
  const isPrivate = Boolean(body.private);

  if (!name || !email || !request_text) {
    return Response.json(
      { error: "Please fill in your name, email, and prayer request." },
      { status: 400 },
    );
  }

  const privacyNote = isPrivate ? "Marked PRIVATE — for the pastor only." : "";

  const result = await sendChurchEmail({
    subject: `New prayer request from ${name}`,
    replyTo: email,
    text:
      `Name: ${name}\n` +
      `Email: ${email}\n` +
      (privacyNote ? `${privacyNote}\n` : "") +
      `\n${request_text}\n`,
    html:
      `<p><strong>Name:</strong> ${escapeHtml(name)}</p>` +
      `<p><strong>Email:</strong> ${escapeHtml(email)}</p>` +
      (privacyNote ? `<p><strong>🔒 ${escapeHtml(privacyNote)}</strong></p>` : "") +
      `<p><strong>Prayer Request:</strong></p>` +
      `<p>${escapeHtml(request_text).replace(/\n/g, "<br>")}</p>`,
  });

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({ success: true });
}
