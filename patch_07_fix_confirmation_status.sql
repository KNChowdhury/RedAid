-- LifelineBD PATCH 07: Fix donor confirmation status.
-- Run in Supabase SQL Editor after patch_06_fix_donation_status.sql.

create or replace function public.confirm_my_donation(p_donation_id uuid)
returns public.donation_records
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  me uuid := public.current_donor_id();
  rec public.donation_records;
begin
  select * into rec from public.donation_records where id = p_donation_id;
  if not found then
    raise exception 'Donation record not found';
  end if;

  if rec.donor_id <> me then
    raise exception 'You can only confirm your own donation';
  end if;

  if rec.credited then
    return rec;
  end if;

  update public.donation_records
  set donor_confirmed = true,
      verified_at = now(),
      status = 'Completed',
      credited = true
  where id = p_donation_id
  returning * into rec;

  update public.donors
  set impact_score = coalesce(impact_score, 0) + 150,
      lives_saved = coalesce(lives_saved, 0) + 1,
      last_donation_date = rec.date,
      available_now = false
  where id = me;

  update public.requests r
  set status = 'Fulfilled'
  where r.id = rec.request_id
    and r.status <> 'Fulfilled'
    and (
      select coalesce(sum(dr.units), 0)
      from public.donation_records dr
      where dr.request_id = r.id
        and dr.requester_confirmed
        and dr.donor_confirmed
    ) >= r.required_bags;

  insert into public.notifications (donor_id, title, message, type)
  values (
    me,
    'Donation confirmed - thank you!',
    'You earned 150 Lifeline points. You can donate again after 120 days.',
    'reward'
  );

  return rec;
end $function$;
