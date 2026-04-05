// GPRN — Approval / Rejection Email Edge Function
//
// Triggered by a Supabase Database Webhook on `public.profiles` UPDATE events.
// Sends a branded approval or rejection email via the Resend API when a
// profile's approval_status transitions from 'pending' to 'approved' or 'rejected'.
//
// Required environment variables (set in Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY   — your Resend API key (https://resend.com)
//   EMAIL_FROM       — a verified sender, e.g. "GPRN <no-reply@yourdomain.com>"
//   APP_URL          — your site URL, e.g. "https://amerc786.github.io/gprn-website"
//
// Deploy:
//   supabase functions deploy send-approval-email --no-verify-jwt
//
// Webhook:
//   Supabase dashboard → Database → Webhooks → Create webhook
//     Name: on_profile_status_change
//     Table: public.profiles
//     Events: Update
//     Type: Supabase Edge Functions
//     Edge Function: send-approval-email
//     HTTP Method: POST

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface ProfileRecord {
  id: string;
  email: string;
  role: "locum" | "practice";
  approval_status: "pending" | "approved" | "rejected";
  profile_data: Record<string, unknown> | null;
  rejection_reason: string | null;
}

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  schema: string;
  record: ProfileRecord | null;
  old_record: ProfileRecord | null;
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "GPRN <no-reply@gprn.co.uk>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://amerc786.github.io/gprn-website";

function displayName(record: ProfileRecord): string {
  const pd = (record.profile_data ?? {}) as Record<string, string>;
  if (record.role === "locum") {
    const bits = [pd.title, pd.firstName, pd.lastName].filter(Boolean);
    if (bits.length) return bits.join(" ");
  } else {
    if (pd.practiceName) return pd.practiceName;
    if (pd.contactName) return pd.contactName;
  }
  return record.email;
}

function firstNameOnly(record: ProfileRecord): string {
  const pd = (record.profile_data ?? {}) as Record<string, string>;
  if (record.role === "locum") {
    if (pd.firstName) return pd.firstName;
  } else {
    // For practices, use the contact's first name if we have it
    if (pd.contactName) {
      const bits = pd.contactName.trim().split(/\s+/);
      if (bits.length) return bits[0];
    }
    if (pd.practiceName) return pd.practiceName;
  }
  return "";
}

function approvalEmailHtml(record: ProfileRecord): { subject: string; html: string; text: string } {
  const firstName = firstNameOnly(record);
  const loginUrl = `${APP_URL}/login.html`;
  const subject = "Your GPRN account has been approved";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(8,20,37,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3B82F6,#5B4DFF,#8B5CF6);padding:32px 40px;color:#ffffff;">
            <div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.01em;">
              <span style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:6px;">GP</span>RN
            </div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">The Right GP, Right Now</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="font-family:'Space Grotesk',Inter,sans-serif;font-size:26px;font-weight:800;color:#081425;margin:0 0 16px;letter-spacing:-0.01em;">
              ${firstName ? "You're approved, " + escapeHtml(firstName) : "You're approved"}
            </h1>
            <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 20px;">
              Good news — your GPRN account has been reviewed and approved. You now have access to the platform.
            </p>
            <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 28px;">
              ${record.role === "locum"
                ? "You can browse available sessions across Wales, submit offers, and manage your bookings from your dashboard."
                : "You can post sessions, review locum GP applications, and manage your practice from your dashboard."}
            </p>
            <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
              <tr><td style="border-radius:10px;background:linear-gradient(135deg,#3B82F6,#5B4DFF);">
                <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                  Log in to your account →
                </a>
              </td></tr>
            </table>
            <p style="font-size:13px;line-height:1.6;color:#64748B;margin:32px 0 0;">
              If you didn't register for a GPRN account, please ignore this email or contact support.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#F1F5F9;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;text-align:center;">
            GPRN · Connecting locum GPs with practices across Wales
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `You're approved!\n\nYour GPRN account has been reviewed and approved. You now have full access to the platform.\n\nLog in: ${loginUrl}\n\n— GPRN`;

  return { subject, html, text };
}

function rejectionEmailHtml(record: ProfileRecord): { subject: string; html: string; text: string } {
  const firstName = firstNameOnly(record);
  const reason = record.rejection_reason;
  const subject = "Update on your GPRN application";

  const reasonBlock = reason
    ? `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:16px;margin:0 0 24px;">
         <div style="font-size:11px;font-weight:700;color:#991B1B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Note from the review team</div>
         <div style="font-size:14px;color:#334155;line-height:1.5;">${escapeHtml(reason)}</div>
       </div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(8,20,37,0.08);">
        <tr>
          <td style="background:linear-gradient(135deg,#3B82F6,#5B4DFF,#8B5CF6);padding:32px 40px;color:#ffffff;">
            <div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.01em;">
              <span style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:6px;">GP</span>RN
            </div>
            <div style="font-size:13px;opacity:0.9;margin-top:4px;">The Right GP, Right Now</div>
          </td>
        </tr>
        <tr>
          <td style="padding:40px;">
            <h1 style="font-family:'Space Grotesk',Inter,sans-serif;font-size:24px;font-weight:800;color:#081425;margin:0 0 16px;letter-spacing:-0.01em;">
              Thank you for your application
            </h1>
            <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 20px;">
              Hi ${escapeHtml(firstName || "there")}, thank you for your interest in joining GPRN. After careful review, we are not able to approve your application at this time.
            </p>
            ${reasonBlock}
            <p style="font-size:15px;line-height:1.6;color:#334155;margin:0 0 16px;">
              We appreciate the time you took to register with us. If you believe this decision was made in error, or if your circumstances change, you are welcome to contact our team.
            </p>
            <p style="font-size:13px;line-height:1.6;color:#64748B;margin:28px 0 0;">
              — The GPRN team
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px;background:#F1F5F9;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;text-align:center;">
            GPRN · Connecting locum GPs with practices across Wales
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = `Thank you for your application.\n\nWe have reviewed your GPRN registration and are not able to approve it at this time.${reason ? "\n\nNote from the review team: " + reason : ""}\n\n— GPRN`;

  return { subject, html, text };
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendEmail(to: string, subject: string, html: string, text: string): Promise<Response> {
  if (!RESEND_API_KEY) {
    return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), { status: 500 });
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [to],
      subject,
      html,
      text,
    }),
  });
  const body = await res.text();
  return new Response(body, { status: res.status, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  if (payload.type !== "UPDATE" || payload.table !== "profiles") {
    return new Response(JSON.stringify({ skipped: "not a profiles UPDATE" }), { status: 200 });
  }

  const next = payload.record;
  const prev = payload.old_record;
  if (!next || !prev) {
    return new Response(JSON.stringify({ skipped: "missing record" }), { status: 200 });
  }

  // Only fire on transitions FROM pending
  if (prev.approval_status !== "pending") {
    return new Response(JSON.stringify({ skipped: "prev status was not pending" }), { status: 200 });
  }

  if (next.approval_status === "approved") {
    const { subject, html, text } = approvalEmailHtml(next);
    return await sendEmail(next.email, subject, html, text);
  }

  if (next.approval_status === "rejected") {
    const { subject, html, text } = rejectionEmailHtml(next);
    return await sendEmail(next.email, subject, html, text);
  }

  return new Response(JSON.stringify({ skipped: "no actionable transition" }), { status: 200 });
});
