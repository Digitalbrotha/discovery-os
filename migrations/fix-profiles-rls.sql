-- Migration: allow users to insert/update their own profile row
-- Run in Supabase SQL editor

-- Users can create their own profile (needed during onboarding)
create policy if not exists "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

-- Users can update their own profile
create policy if not exists "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = id);
