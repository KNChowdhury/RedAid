-- LifelineBD PATCH 17: Expose birth_year through the donor directory view.
-- ----------------------------------------------------------------------------
-- v_donors_directory (patch_03) has an explicit column list, not `select *`,
-- so patch_16's new donors.birth_year column doesn't reach the client for
-- OTHER donors' cards until it's added here too. Without this, age only
-- shows on your own profile (fetched via a direct donors-table row lookup),
-- never on Network/donor cards (fetched via this view).
-- ============================================================================

drop view if exists public.v_donors_directory;
create view public.v_donors_directory as
select
  id, auth_user_id, name, avatar, role,
  blood_group, birth_year, district, area, lat, lng,
  last_donation_date, next_eligible_date,
  is_smoker, is_regular, is_verified, available_now,
  impact_score, lives_saved, created_at
from public.donors;

grant select on public.v_donors_directory to authenticated;

-- NOTE: v_public_donors (the guest/logged-out equivalent) is NOT defined in
-- any patch_NN file in this repo — it was created directly in Supabase, so
-- I can't see its current column list to safely add birth_year here without
-- guessing at (and possibly breaking) whatever else it does or doesn't
-- expose. If you want guests to see donor ages too, run:
--   select pg_get_viewdef('public.v_public_donors', true);
-- and paste the result back so birth_year can be added the same way.
