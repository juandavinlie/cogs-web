-- ── Profile details: name, email, default location ───────────────────────────
alter table public.profiles
  add column full_name      text,
  add column email          text,
  add column location_code  text references public.locations (code) on update cascade on delete set null;

create index profiles_location_code_idx on public.profiles (location_code);

-- Backfill emails for existing users. (Existing users have no name/location yet;
-- fill those in from the Table Editor if needed.)
update public.profiles p set email = u.email from auth.users u where u.id = p.id;

-- New users: copy email, name and default location from the sign-up form
-- (passed as user metadata). Unknown location codes are stored as null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, location_code)
  values (
    new.id,
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
    (select code from public.locations where code = new.raw_user_meta_data ->> 'location_code')
  );
  return new;
end;
$$;

-- Keep profiles.email in sync if a user's email changes.
create function public.handle_user_email_change()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ── Admin access ─────────────────────────────────────────────────────────────
create policy "Admins can view all profiles"
  on public.profiles for select
  to authenticated
  using ((select public.is_admin()));

-- Lets the API join attendance → profiles (name, email, default location).
alter table public.attendance
  add constraint attendance_user_id_profiles_fkey
  foreign key (user_id) references public.profiles (id) on delete cascade;
