-- Add onboarding_completed flag to profiles.
-- Run this migration in the Supabase SQL editor or via psql.

alter table public.profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Mark existing users who already set grade+course as having completed onboarding
-- so they are not forced back through the flow after this migration.
update public.profiles
set onboarding_completed = true
where grade is not null and course is not null;
