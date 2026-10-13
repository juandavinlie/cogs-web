-- Admins can add and delete announcements from the website (/announcements).
create policy "Admins can add announcements"
  on public.announcements for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "Admins can delete announcements"
  on public.announcements for delete
  to authenticated
  using ((select public.is_admin()));
