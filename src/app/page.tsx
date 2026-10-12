import Image from "next/image";
import Link from "next/link";
import buildingPhoto from "../../public/church-building.jpg";
import { Notice, param, type SearchParams } from "@/components/ui";
import { CHURCH } from "@/lib/church";
import { resolveLocationParam } from "@/lib/location-param";
import { getAnnouncements, getLocations, getUpcomingEvents, registrationOpen, type ChurchEvent } from "@/lib/data";
import { formatDateOnly, formatDay, formatTimeRange, sgDate } from "@/lib/time";

function groupByDay(events: ChurchEvent[]) {
  const groups = new Map<string, ChurchEvent[]>();
  for (const e of events) {
    const key = sgDate(e.starts_at);
    groups.set(key, [...(groups.get(key) ?? []), e]);
  }
  return [...groups.values()];
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const message = param(sp, "message");
  // Optional ?location= filter for events; an unknown code is dropped from the URL.
  const location = await resolveLocationParam("/", sp);
  const [announcements, events, locations] = await Promise.all([
    getAnnouncements(),
    getUpcomingEvents(14, location?.code),
    getLocations(),
  ]);
  const today = sgDate();
  const addresses = [...new Set(locations.map((l) => l.address))];

  return (
    <>
      <section className="relative isolate overflow-hidden bg-brand text-white">
        <Image
          src={buildingPhoto}
          alt=""
          fill
          priority
          sizes="100vw"
          placeholder="blur"
          className="-z-20 object-cover object-[70%_40%]"
        />
        {/* Darkens the photo so the title stays readable over the bright sky. */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-dark/95 via-brand-dark/60 to-brand-dark/30 sm:bg-gradient-to-r sm:from-brand-dark/90 sm:via-brand-dark/55 sm:to-transparent" />
        <div className="mx-auto flex min-h-72 max-w-4xl flex-col justify-end px-4 py-12 sm:min-h-96 sm:py-20">
          <h1 className="font-serif text-3xl font-semibold leading-tight drop-shadow sm:text-5xl">{CHURCH.name}</h1>
          <a
            href="#events"
            className="mt-6 self-start rounded-full bg-white px-5 py-2.5 font-medium text-brand hover:bg-brand-soft"
          >
            Upcoming events
          </a>
        </div>
      </section>

      <div className="mx-auto max-w-4xl space-y-12 px-4 py-10">
        {message && <Notice message={message} />}

        {announcements.length > 0 && (
          <section aria-labelledby="announcements">
            <h2 id="announcements" className="font-serif text-2xl font-semibold">Announcements</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {announcements.map((a) => (
                <li key={a.id} className="flex flex-col rounded-xl border border-line bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">{formatDateOnly(a.date)}</p>
                  <h3 className="mt-1 font-semibold">{a.title}</h3>
                  {a.body && <p className="mt-2 text-sm text-muted">{a.body}</p>}
                  {registrationOpen(a, today) && (
                    <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <a
                        href={a.registration_link!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
                      >
                        Register
                      </a>
                      {a.register_by && (
                        <span className="text-sm text-muted">by {formatDateOnly(a.register_by)}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="events-heading" id="events" className="scroll-mt-20">
          <h2 id="events-heading" className="font-serif text-2xl font-semibold">Upcoming events</h2>
          <p className="mt-1 text-sm text-muted">
            {location && (
              <>
                {location.name} + Combined ·{" "}
                <Link href="/#events" className="font-medium text-brand underline-offset-2 hover:underline">
                  Show all locations
                </Link>{" "}
                ·{" "}
              </>
            )}
            Next two weeks · all times in Singapore time
          </p>
          {events.length === 0 ? (
            <p className="mt-4 rounded-xl border border-line bg-white p-5 text-muted">
              No events{location ? ` at ${location.name}` : ""} in the next two weeks.
            </p>
          ) : (
            <div className="mt-4 space-y-6">
              {groupByDay(events).map((day) => (
                <div key={day[0].starts_at}>
                  <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-accent">
                    {sgDate(day[0].starts_at) === today ? "Today" : formatDay(day[0].starts_at)}
                  </h3>
                  <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
                    {day.map((e) => (
                      <li key={e.id} className="flex gap-4 px-5 py-4">
                        <p className="w-36 shrink-0 text-sm text-muted sm:w-44">{formatTimeRange(e.starts_at, e.ends_at)}</p>
                        <div className="min-w-0">
                          <p className="font-medium">{e.name}</p>
                          <p className="text-sm text-muted">{e.locations?.name ?? e.location_code}</p>
                          {e.description && <p className="mt-1 text-sm text-muted">{e.description}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {addresses.length > 0 && (
          <section aria-labelledby="find-us">
            <h2 id="find-us" className="font-serif text-2xl font-semibold">Find us</h2>
            <ul className="mt-4 grid gap-4 sm:grid-cols-2">
              {addresses.map((address) => (
                <li key={address} className="rounded-xl border border-line bg-white p-5">
                  <p className="font-semibold">{address}</p>
                  <a
                    className="mt-1 inline-block text-sm text-brand underline-offset-2 hover:underline"
                    href={`https://maps.google.com/?q=${encodeURIComponent(`${address}, Singapore`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </>
  );
}
