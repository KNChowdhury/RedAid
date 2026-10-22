-- patch_30: guard adoption of bulk-imported (phone-only) donor rows.
--
-- Context: donors from offline lists (e.g. the O+ directory, 2026-10) are
-- imported as donor rows with auth_user_id = null and a synthetic email
-- '<8801XXXXXXXXX>@phone.redaid.invalid' (.invalid is reserved by RFC 2606,
-- so no real mailbox can ever exist). No auth account is created up front.
-- When a donor asks for access, an admin creates the auth user with that
-- email and app_metadata.phone_import = true (service role only), and
-- link_or_get_my_donor() adopts the row on first sign-in.
--
-- Risk this closes: link_or_get_my_donor() adopts ANY unlinked row whose
-- email matches the caller's. Without this guard, anyone could self-sign-up
-- with '8801...@phone.redaid.invalid' and take over that donor's profile
-- (phone, history). app_metadata cannot be set by clients, so requiring
-- phone_import = true limits adoption to admin-created accounts.
-- Idempotent: create or replace; grants restated explicitly.

create or replace function public.link_or_get_my_donor()
 returns donors
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  uid          uuid := auth.uid();
  user_email   text;
  admin_import boolean;
  result       public.donors;
begin
  if uid is null then
    return null;                       -- not signed in
  end if;

  select email, coalesce((raw_app_meta_data ->> 'phone_import')::boolean, false)
    into user_email, admin_import
  from auth.users where id = uid;

  -- Already linked correctly.
  select * into result from public.donors where auth_user_id = uid limit 1;
  if found then
    insert into public.donor_health (donor_id) values (result.id)
      on conflict (donor_id) do nothing;
    return result;
  end if;

  -- Imported phone-only rows may only be adopted by admin-created accounts.
  if lower(user_email) like '%@phone.redaid.invalid' and not admin_import then
    return null;
  end if;

  -- An unlinked row with the caller's own email: adopt it.
  update public.donors
  set auth_user_id = uid
  where auth_user_id is null
    and lower(email) = lower(user_email)
  returning * into result;

  if found then
    insert into public.donor_health (donor_id) values (result.id)
      on conflict (donor_id) do nothing;
    return result;
  end if;

  return null;                         -- caller genuinely has no donor row yet
end $function$;

-- Keep the previous exposure: callable by signed-in users only.
revoke all on function public.link_or_get_my_donor() from public, anon, authenticated;
grant execute on function public.link_or_get_my_donor() to authenticated;
