-- ── Roles ────────────────────────────────────────────────────────────────────
create type public.app_role as enum ('member', 'admin');

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  role        public.app_role not null default 'member',
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can read their own profile. There are deliberately no insert/update/delete
-- policies: roles can only be changed from the Supabase dashboard.
create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Every new user gets a profile with the default "member" role.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill users who signed up before this migration.
insert into public.profiles (id) select id from auth.users on conflict (id) do nothing;

-- Used by RLS policies. security definer so it can read profiles regardless of the caller's policies.
create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin'
  );
$$;

-- ── Admin permissions ────────────────────────────────────────────────────────
create policy "Admins can add events"
  on public.events for insert
  to authenticated
  with check ((select public.is_admin()));

-- Note: deleting an event also deletes its attendance records (on delete cascade).
create policy "Admins can delete events"
  on public.events for delete
  to authenticated
  using ((select public.is_admin()));

create policy "Admins can view all attendance"
  on public.attendance for select
  to authenticated
  using ((select public.is_admin()));

-- ── Check-in opens 30 minutes before an event starts ─────────────────────────
drop policy "Users can check in to ongoing events" on public.attendance;

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
        and now() between e.starts_at - interval '30 minutes' and e.ends_at
    )
  );
