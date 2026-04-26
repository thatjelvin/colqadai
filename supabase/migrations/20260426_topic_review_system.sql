create table if not exists topic_review_questions (
  id uuid primary key default gen_random_uuid(),
  topic_slug text not null,
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  question text not null,
  solution text not null,
  hint text,
  source text,
  created_at timestamp with time zone default now()
);

create index if not exists idx_topic_review_questions_topic_slug
  on topic_review_questions(topic_slug);

create table if not exists user_review_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  question_id uuid references topic_review_questions(id) on delete cascade,
  topic_slug text not null,
  rating text not null check (rating in ('got_it', 'almost', 'didnt_get_it')),
  reviewed_at timestamp with time zone default now()
);

create index if not exists idx_user_review_responses_user_topic
  on user_review_responses(user_id, topic_slug, reviewed_at desc);

create table if not exists review_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  topic_slug text not null,
  scheduled_for timestamp with time zone not null,
  sent boolean default false,
  created_at timestamp with time zone default now()
);

create index if not exists idx_review_reminders_due
  on review_reminders(sent, scheduled_for);

alter table topic_review_questions enable row level security;
alter table user_review_responses enable row level security;
alter table review_reminders enable row level security;

create policy "Allow authenticated read on topic_review_questions"
  on topic_review_questions for select
  to authenticated
  using (true);

create policy "Allow authenticated insert on topic_review_questions"
  on topic_review_questions for insert
  to authenticated
  with check (true);

create policy "Users can read own review responses"
  on user_review_responses for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own review responses"
  on user_review_responses for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own review reminders"
  on review_reminders for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own review reminders"
  on review_reminders for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own review reminders"
  on review_reminders for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can update own review reminders"
  on review_reminders for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
