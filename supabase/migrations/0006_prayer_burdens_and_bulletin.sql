-- Safe to run more than once.

-- ── Announcements ────────────────────────────────────────────────────────────
-- Not every bulletin announcement has a date. (Already applied by hand; safe to re-run.)
alter table public.announcements alter column date drop not null;

-- Keeps the bulletin's own order for announcements with no date.
alter table public.announcements add column if not exists position integer not null default 0;

-- ── Prayer burdens: one record per weekly bulletin ───────────────────────────
create table if not exists public.prayer_burdens (
  bulletin_date  date primary key,
  message_title  text,
  content        text not null,  -- Markdown
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

alter table public.prayer_burdens enable row level security;

drop policy if exists "Prayer burdens are public" on public.prayer_burdens;
create policy "Prayer burdens are public"
  on public.prayer_burdens for select
  to anon, authenticated
  using (true);

drop policy if exists "Admins can add prayer burdens" on public.prayer_burdens;
create policy "Admins can add prayer burdens"
  on public.prayer_burdens for insert
  to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Admins can update prayer burdens" on public.prayer_burdens;
create policy "Admins can update prayer burdens"
  on public.prayer_burdens for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

-- ── Publishing a bulletin ────────────────────────────────────────────────────
-- Runs as one transaction: if anything fails, the existing announcements are kept.
-- p_announcements: [{ title, body, date, register_by, registration_link }, ...]
create or replace function public.publish_bulletin(
  p_bulletin_date date,
  p_message_title text,
  p_prayer_burdens text,
  p_announcements jsonb
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can publish a bulletin' using errcode = '42501';
  end if;

  if jsonb_typeof(p_announcements) is distinct from 'array' or jsonb_array_length(p_announcements) = 0 then
    raise exception 'A bulletin needs at least one announcement' using errcode = '22023';
  end if;

  if nullif(trim(p_prayer_burdens), '') is not null then
    insert into public.prayer_burdens (bulletin_date, message_title, content)
    values (p_bulletin_date, p_message_title, p_prayer_burdens)
    on conflict (bulletin_date) do update
      set message_title = excluded.message_title, content = excluded.content, updated_at = now();
  end if;

  delete from public.announcements where true;

  insert into public.announcements (title, body, date, register_by, registration_link, position)
  select
    item ->> 'title',
    coalesce(item ->> 'body', ''),
    (item ->> 'date')::date,
    (item ->> 'register_by')::date,
    item ->> 'registration_link',
    (ordinality - 1)::integer
  from jsonb_array_elements(p_announcements) with ordinality as t(item, ordinality);
end;
$$;

revoke execute on function public.publish_bulletin(date, text, text, jsonb) from public, anon;
grant execute on function public.publish_bulletin(date, text, text, jsonb) to authenticated;

-- Makes the API notice the new function straight away.
notify pgrst, 'reload schema';
