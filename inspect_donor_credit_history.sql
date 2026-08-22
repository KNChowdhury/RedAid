-- Read-only. Full donation_records history for the donor whose impact_score
-- (1000) and lives_saved (12) don't reconcile against 4 credited rows
-- (expected 600 pts if only confirm_my_donation's +150/+1 ever applied).
select *
from donation_records
where donor_id = '7d663a6a-e549-41ab-bdd3-cb8f0080416f'
order by date;

-- Was this same request/donor pair ever routed through BOTH flows — a
-- requester-logged donation (record_donation, source = 'requester') AND a
-- hospital verification for the same request? If verify_donation writes its
-- own donation_records row rather than updating record_donation's row, the
-- same real-world donation could show up twice here under different sources.
select request_id, count(*) as rows_for_this_request, array_agg(source) as sources, array_agg(credited) as credited_flags
from donation_records
where donor_id = '7d663a6a-e549-41ab-bdd3-cb8f0080416f'
group by request_id
having count(*) > 1;
