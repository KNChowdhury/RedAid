-- LifelineBD PATCH 16: Optional birth_year field for donors.
-- ----------------------------------------------------------------------------
-- Adds a nullable birth_year column so age can be computed client-side
-- (current year - birth_year) instead of storing a raw "age" that would need
-- yearly manual updates. Nothing reads or requires this column yet — this is
-- schema-only, reviewed before any TypeScript/UI changes are made.
-- ============================================================================

alter table public.donors
  add column if not exists birth_year smallint;

-- Sanity bound so obviously-invalid values (typos, joke entries) can't be
-- saved — wide enough to cover any realistic donor (110 years old today was
-- born in 1916; nobody eligible to donate blood is younger than this year).
alter table public.donors
  add constraint donors_birth_year_range
  check (birth_year is null or birth_year between 1900 and extract(year from current_date)::int);
