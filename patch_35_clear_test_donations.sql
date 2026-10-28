-- patch_35: remove the 2026-08-21 test donations and clear the points they gave.
--
-- Background: patch_34 found 3 credited donation_records that are medically
-- impossible (O+ donor for O- / A- patients). Owner confirmed on 2026-10-28
-- that all of them were test data. A 4th, pending record on the same test
-- request (also O+ for O-) is removed too.
--
-- Full atomic reversal, not just points (see CLAUDE.md, "manual data fixes
-- must mirror the full atomic change"): confirm_my_donation()/verify_donation()
-- set impact_score, lives_saved, last_donation_date and available_now together,
-- so all four are reset here. next_eligible_date is cleared too, since it is
-- derived from last_donation_date. Both donors' only donation date was the
-- test date, so last_donation_date goes back to null.
--
-- Success Stories: deleting the records removes their completed_donation_feed
-- rows via the donation_records_sync_completed_feed trigger (fires on DELETE).
--
-- NOT touched: the 2026-10-28 pending records (real users). patch_34 stops the
-- incompatible ones (A+ / B+ for O+) from ever being credited.
-- The 3 test requests (status Fulfilled) are left as they are.
--
-- Idempotent: deletes by id, and the reset sets fixed values.

begin;

delete from public.donation_records
where id in (
  'b38a1e93-d3ba-4064-a799-476e37c2b949',  -- O+ for A-, credited
  '5a400121-f98d-4484-9c8f-5bd3d068d5b1',  -- O+ for O-, credited
  '94eed807-138e-478d-8353-3c46811a35d5',  -- O+ for O-, credited
  '979108f6-4899-4c5c-a77b-892c27115127'   -- O+ for O-, pending, same test request
);

update public.donors
set impact_score       = 0,
    lives_saved        = 0,
    last_donation_date = null,
    next_eligible_date = null,
    available_now      = true
where id in (
  '7d663a6a-e549-41ab-bdd3-cb8f0080416f',
  '37f7cad2-b7b9-49d7-b041-4b15f9ac37dd'
);

commit;

-- Verify after running (expect: 0 records; both donors 0, 0, null, null, true):
-- select count(*) from public.donation_records
-- where id in ('b38a1e93-d3ba-4064-a799-476e37c2b949','5a400121-f98d-4484-9c8f-5bd3d068d5b1',
--              '94eed807-138e-478d-8353-3c46811a35d5','979108f6-4899-4c5c-a77b-892c27115127');
-- select id, impact_score, lives_saved, last_donation_date, next_eligible_date, available_now
-- from public.donors
-- where id in ('7d663a6a-e549-41ab-bdd3-cb8f0080416f','37f7cad2-b7b9-49d7-b041-4b15f9ac37dd');
