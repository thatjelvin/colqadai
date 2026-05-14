create table if not exists feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  message text not null,
  rating integer check (rating between 1 and 5),
  page text not null,
  created_at timestamp with time zone default now()
);

create index if not exists idx_feedback_user_created
  on feedback(user_id, created_at desc);

alter table feedback enable row level security;

create policy "Users can insert own feedback"
  on feedback for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can read own feedback"
  on feedback for select
  to authenticated
  using (auth.uid() = user_id);
