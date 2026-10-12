import type { Metadata } from "next";
import SubmitButton from "@/components/SubmitButton";
import { Notice, param, type SearchParams } from "@/components/ui";
import { getOngoingEvents } from "@/lib/data";
import { resolveLocationParam } from "@/lib/location-param";
import { formatTimeRange } from "@/lib/time";
import { recordAttendance } from "./actions";

export const metadata: Metadata = { title: "Attendance" };

export default async function AttendancePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  // Optional ?location= filter; an unknown code is dropped from the URL.
  const location = await resolveLocationParam("/attendance", sp);

  // Login is enforced by the middleware.
  const events = await getOngoingEvents(location?.code);

  return (
    <div className="mx-auto w-full max-w-md px-4 py-10">
      {location && <p className="text-sm font-semibold uppercase tracking-wide text-accent">{location.name}</p>}
      <h1 className="mt-1 font-serif text-2xl font-semibold">Mark your attendance</h1>
      <p className="mt-1 text-sm text-muted">Choose the event you&apos;re attending.</p>

      <div className="mt-6 space-y-4">
        <Notice error={param(sp, "error")} />

        {events.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-center text-muted">
            There are no events open for check-in{location ? ` at ${location.name}` : ""} right now.
          </p>
        ) : (
          <form action={recordAttendance} className="space-y-4">
            {location && <input type="hidden" name="location" value={location.code} />}
            <fieldset className="space-y-3">
              <legend className="sr-only">Events</legend>
              {events.map((e, i) => (
                <label
                  key={e.id}
                  className="flex cursor-pointer items-center gap-3 rounded-xl border border-line bg-white p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft"
                >
                  <input
                    type="radio"
                    name="event"
                    value={e.id}
                    required
                    defaultChecked={events.length === 1 && i === 0}
                    className="size-5 accent-brand"
                  />
                  <span>
                    <span className="block font-medium">{e.name}</span>
                    <span className="block text-sm text-muted">
                      {formatTimeRange(e.starts_at, e.ends_at)}
                      {` · ${e.locations?.name ?? e.location_code}`}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <SubmitButton pendingText="Recording…">I&apos;m here</SubmitButton>
          </form>
        )}
      </div>
    </div>
  );
}
