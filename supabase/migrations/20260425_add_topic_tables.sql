-- Migration: Add topic_summaries and user_topic_progress tables

create table if not exists topic_summaries (
  id uuid primary key default gen_random_uuid(),
  topic_slug text not null unique,
  parent_slug text not null,
  summary_data jsonb not null,
  created_at timestamp with time zone default now()
);

create table if not exists user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_slug text not null,
  first_explored_at timestamp with time zone default now(),
  review_count integer default 0,
  unique(user_id, topic_slug)
);

-- Enable Row Level Security
alter table topic_summaries enable row level security;
alter table user_topic_progress enable row level security;

-- Policies for topic_summaries: authenticated users can read all summaries
create policy "Allow authenticated read on topic_summaries"
  on topic_summaries for select
  to authenticated
  using (true);

-- Policies for user_topic_progress: users can only read/write their own rows
create policy "Users can read own topic progress"
  on user_topic_progress for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own topic progress"
  on user_topic_progress for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update own topic progress"
  on user_topic_progress for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own topic progress"
  on user_topic_progress for delete
  to authenticated
  using (auth.uid() = user_id);
