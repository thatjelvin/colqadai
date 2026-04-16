-- Supabase profiles table required by auth/billing/runtime flows.
-- Run this entire script in the Supabase SQL editor to create (or repair) the
-- profiles table from scratch.  It is safe to re-run: all DDL is idempotent.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  avatar_url text,
  grade text,
  course text,
  age integer,
  source text,
  challenge text,
  plan text not null default 'FREE',
  -- `tier` is retained for backward compatibility with existing webhook/update paths.
  tier text default 'FREE',
  subscription_status text default 'INACTIVE',
  subscription_current_period_end timestamptz,
  paddle_customer_id text,
  paddle_subscription_id text,
  paddle_price_id text,
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- If the table already existed without these columns, add them safely.
alter table public.profiles add column if not exists challenge text;
alter table public.profiles add column if not exists onboarding_completed boolean not null default false;

create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_paddle_customer_id_idx on public.profiles(paddle_customer_id);

create table if not exists public.usage_events (
  user_id uuid not null references auth.users(id) on delete cascade,
  feature text not null,
  bucket date not null,
  count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, bucket)
);

alter table public.profiles enable row level security;
alter table public.usage_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "usage_events_select_own" on public.usage_events;
create policy "usage_events_select_own"
  on public.usage_events for select
  using (auth.uid() = user_id);

-- Auto-create a profile row when a new user signs up via Supabase Auth.
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Notify PostgREST to reload its schema cache so the table becomes visible
-- immediately without requiring a full service restart.
notify pgrst, 'reload schema';
