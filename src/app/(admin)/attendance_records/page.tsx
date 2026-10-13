import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { inputClass, param, type SearchParams } from "@/components/ui";
import { PAGE_SIZE, getAttendanceEventOptions, getAttendanceRecords, isUuid, pageParam, toQuery } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getLocations, getMemberLocations } from "@/lib/data";
import { formatDay, formatTime, formatTimeRange } from "@/lib/time";

export const metadata: Metadata = { title: "Attendance records" };

export default async function AttendanceRecordsPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const eventParam = param(sp, "event");
  const filters = {
    location: param(sp, "location") || undefined,
    user_location: param(sp, "user_location") || undefined,
    event: isUuid(eventParam) ? eventParam : undefined,
  };
  const page = pageParam(param(sp, "page"));

  const [locations, memberLocations, eventOptions, { rows, total }] = await Promise.all([
    getLocations(),
    getMemberLocations(),
    getAttendanceEventOptions(),
    getAttendanceRecords({ location: filters.location, userLocation: filters.user_location, eventId: filters.event, page }),
  ]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold">Attendance records</h1>

      <Form action="/attendance_records" className="mt-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-4 lg:items-end">
        <label className="block">
          <span className="text-sm font-medium">Event location</span>
          <select name="location" defaultValue={filters.location ?? ""} className={inputClass}>
            <option value="">All</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Member&apos;s location</span>
          <select name="user_location" defaultValue={filters.user_location ?? ""} className={inputClass}>
            <option value="">All</option>
            {memberLocations.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium">Event</span>
          <select name="event" defaultValue={filters.event ?? ""} className={inputClass}>
            <option value="">All events</option>
            {eventOptions.map((e) => (
              <option key={e.id} value={e.id}>
                {formatDay(e.starts_at)}, {formatTime(e.starts_at)} · {e.name}
                {e.locations ? ` (${e.locations.name})` : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
          <button className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark">Filter</button>
          {filtered && (
            <Link href="/attendance_records" className="rounded-lg border border-line px-4 py-2.5 font-medium hover:bg-paper">
              Clear
            </Link>
          )}
        </div>
      </Form>

      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-muted">
            {filtered ? "No attendance matches these filters." : "No attendance recorded yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {rows.map((r) => (
              <li key={r.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4">
                <div className="min-w-0">
                  <p className="font-medium">{r.profiles.full_name ?? r.profiles.email}</p>
                  <p className="truncate text-sm text-muted">
                    {r.profiles.full_name && `${r.profiles.email} · `}
                    {r.profiles.locations?.name ?? "No location"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{r.events.name}</p>
                  <p className="text-sm text-muted">
                    {r.events.locations?.name ?? r.location_code} · {formatDay(r.events.starts_at)},{" "}
                    {formatTimeRange(r.events.starts_at, r.events.ends_at)}
                  </p>
                </div>
                <p className="text-sm text-muted sm:text-right">Checked in {formatTime(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}

        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          hrefFor={(p) => `/attendance_records${toQuery({ ...filters, page: p })}`}
        />
      </div>
    </div>
  );
}
