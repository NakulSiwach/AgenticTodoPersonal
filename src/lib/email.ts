// Server-only: sends mail through Resend's HTTP API (no extra dependency).
// Needs RESEND_API_KEY. EMAIL_FROM defaults to Resend's shared test sender, which can only
// deliver to the address your Resend account was created with until you verify a domain.

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email is not set up on the server yet (missing RESEND_API_KEY).");
  }
}

export type OutgoingEmail = { to: string; subject: string; html: string; text: string };

export async function sendEmail({ to, subject, html, text }: OutgoingEmail): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new EmailNotConfiguredError();
  const from = process.env.EMAIL_FROM || "TaskFlow <onboarding@resend.dev>";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { message?: string };
      detail = body.message ?? "";
    } catch {
      /* ignore unreadable error bodies */
    }
    throw new Error(`Email provider rejected the message (${res.status})${detail ? `: ${detail}` : ""}`);
  }
}

export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "") ||
    "http://localhost:3000"
  );
}
