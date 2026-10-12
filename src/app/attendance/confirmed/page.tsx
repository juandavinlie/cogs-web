import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { param, type SearchParams } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";
import { formatDay, formatTimeRange } from "@/lib/time";

export const metadata: Metadata = { title: "Attendance recorded" };

type AttendanceRow = {
  created_at: string;
  events: { name: string; starts_at: string; ends_at: string; locations: { name: string } | null } | null;
};

export default async function ConfirmedPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const id = param(sp, "id");
  if (!id) notFound();

  // RLS only returns the signed-in user's own records (or any record, for admins).
  const supabase = await createClient();
  const { data } = await supabase
    .from("attendance")
    .select("created_at, events(name, starts_at, ends_at, locations(name))")
    .eq("id", id)
    .maybeSingle();
  const event = (data as AttendanceRow | null)?.events;
  if (!event) notFound();

  const already = param(sp, "already") === "1";

  return (
    <div className="mx-auto w-full max-w-md px-4 py-14 text-center">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-brand-soft text-brand">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="size-8" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h1 className="mt-5 font-serif text-2xl font-semibold">
        {already ? "You're already checked in" : "Attendance recorded"}
      </h1>
      <p className="mt-2 text-muted">
        {already ? "We already have your attendance for this event." : "Thanks for joining us!"}
      </p>

      <dl className="mt-6 divide-y divide-line rounded-xl border border-line bg-white text-left">
        <div className="flex justify-between gap-4 px-5 py-3">
          <dt className="text-muted">Event</dt>
          <dd className="text-right font-medium">{event.name}</dd>
        </div>
        {event.locations && (
          <div className="flex justify-between gap-4 px-5 py-3">
            <dt className="text-muted">Location</dt>
            <dd className="text-right font-medium">{event.locations.name}</dd>
          </div>
        )}
        <div className="flex justify-between gap-4 px-5 py-3">
          <dt className="text-muted">When</dt>
          <dd className="text-right font-medium">
            {formatDay(event.starts_at)}
            <span className="block text-sm font-normal text-muted">{formatTimeRange(event.starts_at, event.ends_at)}</span>
          </dd>
        </div>
      </dl>

      <Link href="/" className="mt-8 inline-block font-medium text-brand underline-offset-2 hover:underline">
        Back to home
      </Link>
    </div>
  );
}
