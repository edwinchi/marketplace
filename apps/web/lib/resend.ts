// Resend transactional email -- a thin REST wrapper (no SDK dependency, same reasoning as
// lib/rdw.ts/lib/regcheck.ts avoiding one) gated by RESEND_API_KEY, matching lib/stripe.ts's
// graceful-degradation pattern: missing key means the feature stays honestly off, not broken.
//
// Verified live before wiring this into any feature: the sandbox sender (onboarding@resend.dev)
// can only deliver to the Resend account's own registered address without a verified custom
// domain -- confirmed via a real 403 ("You can only send testing emails to your own email
// address") followed by a real successful send (returned a real message id) once pointed at that
// address. Swap `from` for a verified afrodeals.net address in the Resend dashboard to lift that
// restriction.
export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export async function sendEmail(params: { to: string; subject: string; html: string; replyTo?: string }): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "AfroDeals Feedback <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      ...(params.replyTo ? { reply_to: params.replyTo } : {}),
    }),
  });
  return res.ok;
}
