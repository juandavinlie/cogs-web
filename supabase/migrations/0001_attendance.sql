-- Attendance records: one row per user, per location, per event, per day.
create table public.attendance (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  location_code   text not null,
  event_id        text not null,
  event_name      text not null,
  attended_on     date not null,
  created_at      timestamptz not null default now(),
  unique (user_id, location_code, event_id, attended_on)
);

create index attendance_location_day_idx on public.attendance (location_code, attended_on);

alter table public.attendance enable row level security;

-- Signed-in users can record attendance only for themselves.
create policy "Users can insert their own attendance"
  on public.attendance for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Signed-in users can see only their own attendance.
create policy "Users can view their own attendance"
  on public.attendance for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- No update/delete policies: records are append-only for regular users.
-- Staff reports can be run from the Supabase dashboard (which bypasses RLS).
