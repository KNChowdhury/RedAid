-- Read-only. Checks whether next_eligible_date is actually populated for
-- donors who have a last_donation_date set — if it's null despite having
-- donated, that's a data/trigger gap, not a bug in the new UI code (which
-- only shows "Available from" when next_eligible_date is non-empty).
select id, name, available_now, last_donation_date, next_eligible_date
from donors
where last_donation_date is not null
order by last_donation_date desc;
