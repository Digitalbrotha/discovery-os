-- Migration: add test_types to hypotheses
-- Run in Supabase SQL editor

alter table public.hypotheses
  add column if not exists test_types text[]
  check (
    test_types <@ array['survey', 'data', 'prototype']::text[]
  );

comment on column public.hypotheses.test_types is
  'Assumption testing types used for this hypothesis. Values: survey, data, prototype.';
