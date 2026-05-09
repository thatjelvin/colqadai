alter table user_topic_progress add column if not exists mastery_percent integer default 0;
alter table user_topic_progress add column if not exists last_reviewed_at timestamp with time zone;
alter table user_topic_progress add column if not exists next_review_due timestamp with time zone;
alter table user_topic_progress add column if not exists chapters_completed integer default 0;

create table if not exists user_streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique,
  current_streak integer default 0,
  longest_streak integer default 0,
  last_activity_date date
);

alter table user_streaks enable row level security;

create policy "Users can read own streak"
  on user_streaks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own streak"
  on user_streaks for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own streak"
  on user_streaks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
