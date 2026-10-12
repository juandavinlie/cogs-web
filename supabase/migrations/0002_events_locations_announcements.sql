-- Times are stored as timestamptz (absolute instants). Setting the database
-- time zone to SGT means times typed without an offset (e.g. '2026-10-19 09:00')
-- in the SQL editor are read as Singapore time.
alter database postgres set timezone to 'Asia/Singapore';

-- ── Locations ────────────────────────────────────────────────────────────────
create table public.locations (
  code     text primary key check (code ~ '^[a-z0-9-]+$'),  -- used in URLs: /{code}/attendance
  name     text not null,
  address  text not null
);

insert into public.locations (code, name, address) values
  ('rhe',      'Redhill English', '229 Alexandra Rd'),
  ('combined', 'Combined',        '229 Alexandra Rd');

-- ── Events ───────────────────────────────────────────────────────────────────
-- One row per occurrence (e.g. each Sunday service is its own row).
create table public.events (
  id                   uuid primary key default gen_random_uuid(),
  location_code        text not null references public.locations (code) on update cascade,
  name                 text not null,
  description          text,
  starts_at            timestamptz not null,
  ends_at              timestamptz not null,
  requires_attendance  boolean not null default false,
  created_at           timestamptz not null default now(),
  check (ends_at > starts_at),
  unique (id, location_code)  -- lets attendance reference (event, location) together
);

create index events_starts_at_idx on public.events (starts_at);
create index events_location_starts_at_idx on public.events (location_code, starts_at);

-- ── Announcements ────────────────────────────────────────────────────────────
create table public.announcements (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  body               text not null default '',
  date               date not null,   -- the date the announcement is about
  register_by        date,            -- optional registration deadline (inclusive, SGT)
  registration_link  text check (registration_link ~* '^https?://'),
  created_at         timestamptz not null default now()
);

create index announcements_date_idx on public.announcements (date);

-- ── Public read access ───────────────────────────────────────────────────────
-- Anyone (logged in or not) can read these. Edits happen in the Supabase dashboard.
alter table public.locations     enable row level security;
alter table public.events        enable row level security;
alter table public.announcements enable row level security;

create policy "Locations are public"     on public.locations     for select to anon, authenticated using (true);
create policy "Events are public"        on public.events        for select to anon, authenticated using (true);
create policy "Announcements are public" on public.announcements for select to anon, authenticated using (true);

-- ── Attendance (replaces the version from 0001) ──────────────────────────────
-- WARNING: this drops any attendance rows recorded with the old schema.
drop table if exists public.attendance;

create table public.attendance (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  event_id       uuid not null,
  location_code  text not null,
  created_at     timestamptz not null default now(),
  foreign key (event_id, location_code) references public.events (id, location_code)
    on update cascade on delete cascade,
  unique (user_id, event_id)  -- one check-in per person per event
);

create index attendance_event_idx on public.attendance (event_id);

alter table public.attendance enable row level security;

-- Users can check in only themselves, and only to an event at that location
-- that requires attendance and is happening right now.
create policy "Users can check in to ongoing events"
  on public.attendance for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.events e
      where e.id = attendance.event_id
        and e.location_code = attendance.location_code
        and e.requires_attendance
        and now() between e.starts_at and e.ends_at
    )
  );

create policy "Users can view their own attendance"
  on public.attendance for select
  to authenticated
  using ((select auth.uid()) = user_id);
