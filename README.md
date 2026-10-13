# Church website

Next.js (App Router) + Tailwind + Supabase Auth & Postgres.

- `/`: upcoming announcements, events in the next two weeks, and address. Public; looks the same whether or not you're logged in.
- `/login`, `/signup`, `/check-email`, `/forgot-password`, `/reset-password`: email/password auth with email verification and password reset.
- `/attendance`: logged-in only. Lists events that require attendance and are open for check-in (from 30 minutes before start until the end); check in to one. Add `?location=rhe` (any location code) to only show that location's events plus Combined events. The home page supports the same filter. Saves to the `attendance` table and shows a confirmation page.

- `/events`: admins only. Lists all events, filterable by location and date range, with attendee counts and a delete button.
- `/events/add`: admins only. Form to add an event.
- `/announcements`: admins only. Lists announcements, filterable by date range (matching either the date or the register-by date), with a delete button.
- `/announcements/add`: admins only. Form to add an announcement (title, details, date, optional registration link and register-by date).
- `/members`: admins only. All users (members and admins), paginated, filterable by name, email and location.
- `/attendance_records`: admins only. All check-ins, paginated, filterable by event location, the member's own location, and event.

All times are Singapore time (SGT).

## Roles

Each user has a row in `profiles` with `full_name`, `email`, `location_code` (their default location, chosen at sign-up; Combined isn't offered) and `role` = `member` (default) or `admin`. To make someone an admin, open the `profiles` table in the Supabase Table Editor and change their `role`. Find their `id` under *Authentication → Users*. Roles can't be changed from the website. Non-admins who visit `/events` see a 404.

## Setup

1. **Create a Supabase project** at https://supabase.com.
2. **Create the tables:** In the Supabase SQL Editor, run each file in `supabase/migrations/` in order.
   Optionally run `supabase/seed.sql` for sample events and announcements, including a "Test Check-in" event happening now at `rhe`.
3. **Environment:** `cp .env.example .env.local` and fill in values from *Project Settings → API*.
4. **Auth settings** (*Authentication → URL Configuration*):
   - Site URL: `http://localhost:3000` (your real domain in production)
   - Redirect URLs: add `http://localhost:3000/**` and `https://your-domain/**`
   - *Authentication → Providers → Email*: make sure **Confirm email** is on.
5. **Email templates (recommended).** These let links work even when opened on a different device from the one used to sign up. In *Authentication → Email Templates*:
   - **Confirm signup:** `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/">Confirm your email</a>`
   - **Reset password:** `<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password">Reset your password</a>`

   The default templates also work, but only if the link is opened in the same browser.
6. `npm install && npm run dev`

> Supabase's built-in email sender is heavily rate-limited (a few emails per hour). Before launch, set up custom SMTP under *Authentication → Emails → SMTP settings*. Resend, Postmark or SendGrid all work.

## Managing content

Admins can add and delete events at `/events` and announcements at `/announcements`. Everything else (including edits) is done in the Supabase **Table Editor**:

| Table | What it is |
|---|---|
| `locations` | `code` (used in `?location=`), `name`, `address`. Currently `rhe` and `combined`. Events at `combined` show under every location filter (`COMBINED_LOCATION_CODE` in `src/lib/data.ts`). |
| `events` | One row per occurrence: `location_code`, `name`, `description`, `starts_at`, `ends_at`, `requires_attendance`. |
| `announcements` | `title`, `body`, `date`, optional `register_by` and `registration_link`. |

- **Home page events:** anything that hasn't ended and starts within 14 days.
- **Check-in list** (`getOngoingEvents` in `src/lib/data.ts`): events (at the `?location=` location, if given) with `requires_attendance = true` where `starts_at − 30 min ≤ now ≤ ends_at`. The 30 minutes is `CHECK_IN_OPENS_EARLY_MINUTES`; if you change it, change the attendance insert policy in the database to match.
- **Announcements:** shown if their `date` or `register_by` is today or later, soonest first (whichever of the two comes next), up to 6. The **Register** link is hidden once `register_by` has passed.
- **Entering times:** include the offset to be safe, e.g. `2026-10-19 09:00+08`. In the SQL editor, times without an offset are read as SGT.

Site name: `src/lib/church.ts`. Colors and fonts: `src/app/globals.css`.

## Attendance data

Each check-in stores `user_id`, `event_id`, `location_code` and `created_at`; a person can check in once per event. **Deleting an event also deletes its attendance records.** The database itself only accepts a check-in for the user themselves, to an event at that location that requires attendance and is happening now. Users can only read their own rows. To see everyone's attendance, use SQL in the dashboard:

```sql
select e.starts_at, e.location_code, e.name, count(a.id) as attendees
from events e left join attendance a on a.event_id = e.id
where e.requires_attendance
group by e.id order by e.starts_at desc;
```

Tip: print a QR code per location that links to `https://your-domain/attendance?location=rhe`, etc.
