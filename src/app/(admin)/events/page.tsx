import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { Notice, param, type SearchParams } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { ADMIN_EVENTS_LIMIT, getEventsForAdmin, getLocations } from "@/lib/data";
import { formatDay, formatTimeRange, sgDate } from "@/lib/time";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { isDate } from "@/lib/url";
import { deleteEvent } from "./actions";

export const metadata: Metadata = { title: "Manage events" };

export default async function EventsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;

  // Default to upcoming events: from today onward.
  const filters = {
    location: param(sp, "location") || undefined,
    from: "from" in sp ? isDate(param(sp, "from")) : sgDate(),
    to: isDate(param(sp, "to")),
  };

  const [locations, events] = await Promise.all([getLocations(), getEventsForAdmin(filters)]);
  const query = new URLSearchParams(
    Object.entries(filters).flatMap(([k, v]) => (v ? [[k, v]] : [])) as [string, string][],
  ).toString();
  const returnTo = `/events${query ? `?${query}` : ""}`;
  const now = Date.now();

  const inputClass =
    "mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Events</h1>
        <Link href="/events/add" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          + Add event
        </Link>
      </div>

      <Form action="/events" className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-4 sm:items-end">
        <label className="col-span-2 block sm:col-span-1">
          <span className="text-sm font-medium">Location</span>
          <select name="location" defaultValue={filters.location ?? ""} className={inputClass}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">From</span>
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">To</span>
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={inputClass} />
        </label>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <button className="flex-1 rounded-lg bg-brand px-4 py-2 font-medium text-white hover:bg-brand-dark">Filter</button>
          <Link href="/events?from=" className="rounded-lg border border-line px-4 py-2 text-center font-medium hover:bg-paper">
            All
          </Link>
        </div>
      </Form>

      <div className="mt-6 space-y-4">
        <Notice error={param(sp, "error")} message={param(sp, "message")} />

        <p className="text-sm text-muted">
          {events.length === ADMIN_EVENTS_LIMIT ? `Showing the first ${ADMIN_EVENTS_LIMIT} events. Narrow the filters to see more.` : `${events.length} event${events.length === 1 ? "" : "s"}`}
          {" · "}times in Singapore time
        </p>

        {events.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-muted">No events match these filters.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {events.map((e) => {
              const attendees = e.attendance?.[0]?.count ?? 0;
              const past = new Date(e.ends_at).getTime() < now;
              return (
                <li key={e.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center ${past ? "opacity-60" : ""}`}>
                  <div className="sm:w-48 sm:shrink-0">
                    <p className="font-medium">{formatDay(e.starts_at)}</p>
                    <p className="text-sm text-muted">{formatTimeRange(e.starts_at, e.ends_at)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.name}</p>
                    <p className="text-sm text-muted">
                      {e.locations?.name ?? e.location_code}
                      {e.requires_attendance && ` · ${attendees} checked in`}
                    </p>
                    {e.requires_attendance && (
                      <span className="mt-1 inline-block rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand-dark">
                        Attendance
                      </span>
                    )}
                  </div>
                  <ConfirmDeleteButton
                    action={deleteEvent}
                    id={e.id}
                    returnTo={returnTo}
                    confirmMessage={`Delete “${e.name}”?${
                      attendees > 0 ? `\n\nThis will also delete ${attendees} attendance record${attendees === 1 ? "" : "s"}.` : ""
                    }`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
