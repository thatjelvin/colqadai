-- Caches AI-generated summaries so they are not regenerated on repeat visits
create table if not exists topic_summaries (
  id uuid primary key default gen_random_uuid(),
  topic_slug text not null unique,
  parent_slug text not null,
  summary_data jsonb not null,
  created_at timestamp with time zone default now()
);

-- Tracks each user's progress across topics
create table if not exists user_topic_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_slug text not null,
  first_explored_at timestamp with time zone default now(),
  review_count integer default 0,
  session_count integer not null default 0,
  last_mode text,
  last_session_at timestamptz,
  unique(user_id, topic_slug)
);
