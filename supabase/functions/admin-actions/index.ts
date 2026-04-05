// GPRN — Admin Actions Edge Function
//
// Handles privileged admin operations that require the service role key:
//   - reset_password  : triggers a Supabase password recovery email
//   - delete_user     : permanently deletes an auth user (and their profile via cascade)
//   - resend_approval_email : re-sends the branded approval email via Resend
//
// Security model:
//   1. Caller must supply their Supabase access token in the Authorization header
//   2. We resolve their user id from /auth/v1/user
//   3. We look up profiles.is_admin for that id using the service role — if not true, reject
//   4. Only then do we perform the requested action
//
// The service role key NEVER leaves this function.
//
// Required environment variables (auto-injected by Supabase):
//   SUPABASE_URL
//   SUPABASE_ANON_KEY
//   SUPABASE_SERVICE_ROLE_KEY
//
// Additional secrets (set these manually in Supabase dashboard → Edge Functions → Secrets):
//   RESEND_API_KEY    — your Resend API key
//   EMAIL_FROM        — e.g. "GPRN <no-reply@yourdomain.com>"
//   APP_URL           — e.g. "https://amerc786.github.io/gprn-website"
//
// Deploy:
//   supabase functions deploy admin-actions --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "GPRN <no-reply@gprn.co.uk>";
const APP_URL = Deno.env.get("APP_URL") ?? "https://amerc786.github.io/gprn-website";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface ProfileRow {
  id: string;
  email: string;
  role: "locum" | "practice";
  approval_status: string;
  is_admin: boolean;
  profile_data: Record<string, unknown> | null;
}

async function getCallerUserId(accessToken: string): Promise<string | null> {
  // Verify the JWT by calling /auth/v1/user with the caller's token.
  // We use the service role key as the apikey (it's always auto-injected,
  // unlike SUPABASE_ANON_KEY which may not be available in dashboard-deployed
  // functions). Supabase's auth endpoint validates the JWT signature against
  // the project secret and returns the authenticated user's id, so this
  // is a full cryptographic verification — not a bare JWT decode.
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) return null;
  const body = await res.json();
  return body?.id ?? null;
}

async function isCallerAdmin(userId: string): Promise<boolean> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}&select=is_admin,approval_status`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) return false;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return false;
  return rows[0].is_admin === true && rows[0].approval_status === "approved";
}

async function fetchProfileById(profileId: string): Promise<ProfileRow | null> {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${profileId}&select=id,email,role,approval_status,is_admin,profile_data`,
    {
      headers: {
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
    },
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;
  return rows[0];
}

// ---- Action: reset_password ----
async function actionResetPassword(email: string): Promise<Response> {
  // Public recover endpoint — sends Supabase's built-in password reset email.
  // `redirect_to` tells Supabase where to send the user when they click the
  // link in the email. The target URL must be in the Supabase project's
  // Redirect URLs allowlist (Auth → URL Configuration).
  const redirectTo = `${APP_URL}/reset-password.html`;
  const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, redirect_to: redirectTo }),
  });
  if (!res.ok) {
    const text = await res.text();
    return jsonResponse({ error: `Reset request failed: ${text}` }, 500);
  }
  return jsonResponse({ success: true, message: `Password reset email sent to ${email}` });
}

// ---- Action: delete_user ----
async function actionDeleteUser(profileId: string): Promise<Response> {
  // Admin API delete — cascades to profiles row via FK
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${profileId}`, {
    method: "DELETE",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
  });
  if (!res.ok && res.status !== 204 && res.status !== 200) {
    const text = await res.text();
    return jsonResponse({ error: `Delete failed: ${text}` }, 500);
  }
  return jsonResponse({ success: true });
}

// ---- Action: resend_approval_email ----
function firstNameOnly(profile: ProfileRow): string {
  const pd = (profile.profile_data ?? {}) as Record<string, string>;
  if (profile.role === "locum") {
    if (pd.firstName) return pd.firstName;
  } else {
    if (pd.contactName) {
      const bits = pd.contactName.trim().split(/\s+/);
      if (bits.length) return bits[0];
    }
    if (pd.practiceName) return pd.practiceName;
  }
  return "";
}

function buildApprovalEmail(profile: ProfileRow): { subject: string; html: string; text: string } {
  const firstName = firstNameOnly(profile);
  const loginUrl = `${APP_URL}/login.html`;
  const subject = "Your GPRN account has been approved";

  const roleCopy = profile.role === "locum"
    ? "You can browse available sessions across Wales, submit offers, and manage your bookings from your dashboard."
    : "You can post sessions, review locum GP applications, and manage your practice from your dashboard.";

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Roboto,sans-serif;color:#0F172A;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8FAFC;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(8,20,37,0.08);">
        <tr><td style="background:linear-gradient(135deg,#3B82F6,#5B4DFF,#8B5CF6);padding:32px 40px;color:#ffffff;">
          <div style="font-family:'Space Grotesk',Inter,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.01em;">
            <span style="background:rgba(255,255,255,0.15);padding:4px 10px;border-radius:6px;">GP</span>RN
          </div>
          <div style="font-size:13px;opacity:0.9;margin-top:4px;">The Right GP, Right Now</div>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="font-family:'Space Grotesk',Inter,sans-serif;font-size:26px;font-weight:800;color:#081425;margin:0 0 16px;letter-spacing:-0.01em;">
            ${firstName ? "You're approved, " + escapeHtml(firstName) : "You're approved"}
          </h1>
          <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 20px;">
            Good news — your GPRN account has been reviewed and approved. You now have access to the platform.
          </p>
          <p style="font-size:16px;line-height:1.6;color:#334155;margin:0 0 28px;">${roleCopy}</p>
          <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
            <tr><td style="border-radius:10px;background:linear-gradient(135deg,#3B82F6,#5B4DFF);">
              <a href="${loginUrl}" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:10px;">
                Log in to your account →
              </a>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 40px;background:#F1F5F9;border-top:1px solid #E2E8F0;font-size:12px;color:#64748B;text-align:center;">
          GPRN · Connecting locum GPs with practices across Wales
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = `You're approved!\n\nYour GPRN account has been reviewed and approved. You now have full access to the platform.\n\nLog in: ${loginUrl}\n\n— GPRN`;
  return { subject, html, text };
}

async function actionResendApprovalEmail(profile: ProfileRow): Promise<Response> {
  if (!RESEND_API_KEY) {
    return jsonResponse({ error: "RESEND_API_KEY not configured on this function" }, 500);
  }
  if (profile.approval_status !== "approved") {
    return jsonResponse({ error: "Can only resend approval email for approved profiles" }, 400);
  }
  const { subject, html, text } = buildApprovalEmail(profile);
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_FROM,
      to: [profile.email],
      subject,
      html,
      text,
    }),
  });
  const body = await res.text();
  if (!res.ok) {
    return jsonResponse({ error: `Resend failed (HTTP ${res.status}): ${body}` }, 500);
  }
  return jsonResponse({ success: true });
}

// ---- Main handler ----
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // 1. Authn
  const authHeader = req.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return jsonResponse({ error: "Missing Authorization header" }, 401);
  }

  const callerId = await getCallerUserId(token);
  if (!callerId) {
    return jsonResponse({ error: "Invalid or expired token" }, 401);
  }

  // 2. Authz — must be an approved admin
  const admin = await isCallerAdmin(callerId);
  if (!admin) {
    return jsonResponse({ error: "Forbidden — admin access required" }, 403);
  }

  // 3. Parse request
  let payload: { action?: string; profile_id?: string };
  try {
    payload = await req.json();
  } catch (_e) {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const action = payload.action;
  const profileId = payload.profile_id;
  if (!action || !profileId) {
    return jsonResponse({ error: "action and profile_id are required" }, 400);
  }

  // Admin cannot target themselves with destructive actions (safety net)
  if ((action === "delete_user") && profileId === callerId) {
    return jsonResponse({ error: "You cannot delete your own admin account here. Ask another admin or use the SQL editor." }, 400);
  }

  // 4. Dispatch
  const target = await fetchProfileById(profileId);
  if (!target) {
    return jsonResponse({ error: "Target profile not found" }, 404);
  }

  switch (action) {
    case "reset_password":
      return await actionResetPassword(target.email);
    case "delete_user":
      return await actionDeleteUser(profileId);
    case "resend_approval_email":
      return await actionResendApprovalEmail(target);
    default:
      return jsonResponse({ error: `Unknown action: ${action}` }, 400);
  }
});
