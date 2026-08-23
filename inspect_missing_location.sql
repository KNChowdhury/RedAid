-- Read-only. Finds every donor row with a missing/blank district or area —
-- covers both "is this specific user affected" (2a) and "how many others
-- have the same gap" (2c) in one query. These are pre-existing rows from
-- before the signUpDonor race-condition fix; the Edit Profile form already
-- lets a donor fill these in themselves (confirmed via code review, no fix
-- needed there).
select id, name, email, district, area, created_at
from donors
where district is null or trim(district) = ''
   or area is null or trim(area) = ''
order by created_at;
