-- Sample data for trying things out. Safe to run more than once (it adds more rows each time).
-- Dates are relative to "now", so there's always something in the next two weeks.

-- Weekly events for this week and the next two (past ones are simply hidden by the site).
with weeks as (
  select (date_trunc('week', now() at time zone 'Asia/Singapore'))::date + (w * 7) as monday
  from generate_series(0, 2) as w
)
insert into public.events (location_code, name, starts_at, ends_at, requires_attendance)
select * from (
  select 'rhe', 'Sunday Worship',
         (monday + 6 + time '09:00') at time zone 'Asia/Singapore',
         (monday + 6 + time '10:30') at time zone 'Asia/Singapore', true from weeks
  union all
  select 'combined', 'Combined Prayer Meeting',
         (monday + 2 + time '20:00') at time zone 'Asia/Singapore',
         (monday + 2 + time '21:30') at time zone 'Asia/Singapore', true from weeks
  union all
  select 'rhe', 'Youth Fellowship',
         (monday + 5 + time '15:00') at time zone 'Asia/Singapore',
         (monday + 5 + time '17:00') at time zone 'Asia/Singapore', false from weeks
) s;

-- An event happening right now, so you can test /rhe/attendance. Delete it when done.
insert into public.events (location_code, name, description, starts_at, ends_at, requires_attendance)
values ('rhe', 'Test Check-in', 'Temporary event for testing attendance',
        now() - interval '30 minutes', now() + interval '4 hours', true);

-- Announcements.
insert into public.announcements (title, body, date, register_by, registration_link) values
  ('Church Camp 2026',
   'Three days of worship, fellowship and rest. Open to all ages.',
   (now() at time zone 'Asia/Singapore')::date + 40,
   (now() at time zone 'Asia/Singapore')::date + 10,
   'https://example.org/camp'),
  ('Baptism Class',
   'For anyone considering baptism. Talk to a pastor after service.',
   (now() at time zone 'Asia/Singapore')::date + 12,
   (now() at time zone 'Asia/Singapore')::date + 5,
   'https://example.org/baptism'),
  ('Harvest Thanksgiving Lunch',
   'Stay back after Sunday Worship for lunch together in the hall.',
   (now() at time zone 'Asia/Singapore')::date + 6,
   null, null),
  ('Old announcement (should be hidden)',
   'This one is in the past and should not appear on the home page.',
   (now() at time zone 'Asia/Singapore')::date - 3,
   null, null);
