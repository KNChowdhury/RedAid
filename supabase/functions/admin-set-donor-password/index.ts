// Admin-only: give a bulk-imported (phone-only) donor a password, creating
// their auth account on first use. This is the activation and the password
// reset path for those donors: no SMS, and their email is a synthetic
// '<8801XXXXXXXXX>@phone.redaid.invalid' address that cannot receive mail.
//
// Security:
// - The caller must be signed in AND public.is_admin() must be true, checked
//   with the caller's own JWT (not the service role).
// - Only donor rows on the synthetic phone domain can be touched, so this can
//   never reset the password of a normal email account.
// - The account is created with app_metadata.phone_import = true, which
//   patch_30's link_or_get_my_donor() requires before adopting the row.
// - Never logs phone numbers or passwords.
import { createClient } from 'npm:@supabase/supabase-js@2.45.4';

const PHONE_DOMAIN = '@phone.redaid.invalid';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

/** 01712345678 / +8801712345678 / 8801712345678 -> 1712345678, else null */
function bdDigits(input: string): string | null {
  let d = String(input || '').replace(/\D/g, '');
  if (d.startsWith('00880')) d = d.slice(5);
  if (d.startsWith('880')) d = d.slice(3);
  if (d.startsWith('0')) d = d.slice(1);
  return /^1[3-9]\d{8}$/.test(d) ? d : null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json(405, { error: 'method_not_allowed' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';

  // 1. Authorize as the caller.
  const asCaller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await asCaller.auth.getUser();
  if (!userData?.user) return json(401, { error: 'not_signed_in' });
  const { data: isAdmin, error: adminErr } = await asCaller.rpc('is_admin');
  if (adminErr || isAdmin !== true) return json(403, { error: 'not_admin' });

  // 2. Validate input.
  let body: { phone?: string; password?: string };
  try { body = await req.json(); } catch { return json(400, { error: 'bad_json' }); }
  const digits = bdDigits(body.phone ?? '');
  const password = String(body.password ?? '');
  if (!digits) return json(400, { error: 'invalid_phone' });
  if (password.length < 8 || password.length > 72) return json(400, { error: 'password_length' });

  const email = `880${digits}${PHONE_DOMAIN}`;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  // 3. Find the imported donor row (synthetic domain only).
  const { data: donor, error: donorErr } = await admin
    .from('donors').select('id, auth_user_id').eq('email', email).maybeSingle();
  if (donorErr) return json(500, { error: 'lookup_failed' });
  if (!donor) return json(404, { error: 'no_imported_donor' });

  // 4. Existing account: reset password. Otherwise create and link.
  if (donor.auth_user_id) {
    const { error } = await admin.auth.admin.updateUserById(donor.auth_user_id, { password });
    if (error) return json(500, { error: 'reset_failed' });
    return json(200, { ok: true, action: 'password_reset' });
  }

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { phone_import: true },
  });
  if (createErr || !created?.user) return json(500, { error: 'create_failed' });

  // Link now (guarded against a concurrent link) instead of waiting for first sign-in.
  const { error: linkErr } = await admin
    .from('donors').update({ auth_user_id: created.user.id })
    .eq('id', donor.id).is('auth_user_id', null);
  if (linkErr) return json(500, { error: 'link_failed' });

  return json(200, { ok: true, action: 'account_created' });
});
