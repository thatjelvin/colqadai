-- Adds session tracking for adaptive review (beginner vs mastery).
-- Idempotent: safe to re-run.

alter table public.user_topic_progress
  add column if not exists session_count integer not null default 0;

alter table public.user_topic_progress
  add column if not exists last_mode text;

alter table public.user_topic_progress
  add column if not exists last_session_at timestamptz;

alter table public.user_topic_progress
  drop constraint if exists user_topic_progress_last_mode_check;

alter table public.user_topic_progress
  add constraint user_topic_progress_last_mode_check
  check (last_mode is null or last_mode in ('beginner', 'mastery'));
