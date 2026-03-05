-- Migration: scope hypotheses and objectives to teams
-- Run in Supabase SQL editor

alter table public.hypotheses
  add column if not exists team_id uuid references public.teams(id) on delete set null;

alter table public.objectives
  add column if not exists team_id uuid references public.teams(id) on delete set null;

create index if not exists hypotheses_team_id_idx on public.hypotheses(team_id);
create index if not exists objectives_team_id_idx on public.objectives(team_id);
