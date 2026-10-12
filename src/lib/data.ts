import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { sgDate } from "@/lib/time";

export type Location = { code: string; name: string; address: string };

export type ChurchEvent = {
  id: string;
  location_code: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  requires_attendance: boolean;
  locations: { name: string } | null;
};

export type Announcement = {
  id: string;
  title: string;
  body: string;
  date: string; // YYYY-MM-DD
  register_by: string | null; // YYYY-MM-DD
  registration_link: string | null;
};

/** Check-in opens this many minutes before an event starts. Keep in sync with the RLS policy on attendance. */
export const CHECK_IN_OPENS_EARLY_MINUTES = 30;

/** Events at this location are shared by every location, so they show up under any ?location= filter. */
export const COMBINED_LOCATION_CODE = "combined";

/** Location codes whose events belong under a location filter: the location itself plus Combined. */
function locationCodesFor(locationCode: string) {
  return [...new Set([locationCode, COMBINED_LOCATION_CODE])];
}

const EVENT_COLUMNS = "id, location_code, name, description, starts_at, ends_at, requires_attendance, locations(name)";

export const getLocations = cache(async (): Promise<Location[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.from("locations").select("code, name, address").order("name");
  if (error) console.error("getLocations failed", error);
  return data ?? [];
});

/** Locations a member can belong to (everything except the shared Combined location). */
export async function getMemberLocations(): Promise<Location[]> {
  return (await getLocations()).filter((l) => l.code !== COMBINED_LOCATION_CODE);
}

export const getLocation = cache(async (code: string): Promise<Location | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("locations")
    .select("code, name, address")
    .eq("code", code.toLowerCase())
    .maybeSingle();
  if (error) console.error("getLocation failed", error);
  return data;
});

/**
 * Events that haven't finished yet and start within the next `days` days, soonest first.
 * Pass a location code to only include events at that location (plus Combined events).
 */
export async function getUpcomingEvents(days = 14, locationCode?: string): Promise<ChurchEvent[]> {
  const now = new Date();
  const until = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .gt("ends_at", now.toISOString())
    .lt("starts_at", until.toISOString())
    .order("starts_at");
  if (locationCode) query = query.in("location_code", locationCodesFor(locationCode));

  const { data, error } = await query;
  if (error) console.error("getUpcomingEvents failed", error);
  return (data as ChurchEvent[] | null) ?? [];
}

/**
 * Events that require attendance and are open for check-in (from 30 min before start until the end).
 * Pass a location code to only include events at that location (plus Combined events).
 */
export async function getOngoingEvents(locationCode?: string): Promise<ChurchEvent[]> {
  const nowMs = Date.now();
  const now = new Date(nowMs).toISOString();
  const opensBy = new Date(nowMs + CHECK_IN_OPENS_EARLY_MINUTES * 60 * 1000).toISOString();

  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(EVENT_COLUMNS)
    .eq("requires_attendance", true)
    .lte("starts_at", opensBy)
    .gte("ends_at", now)
    .order("starts_at")
    .order("name");
  if (locationCode) query = query.in("location_code", locationCodesFor(locationCode));

  const { data, error } = await query;
  if (error) console.error("getOngoingEvents failed", error);
  return (data as ChurchEvent[] | null) ?? [];
}

/** Whether registration is still open (no deadline, or deadline is today or later in SGT). */
export function registrationOpen(a: Announcement, today = sgDate()) {
  return Boolean(a.registration_link) && (!a.register_by || a.register_by >= today);
}

/**
 * The most upcoming announcements: those whose date or registration deadline
 * hasn't passed, ordered by whichever of the two comes up next.
 */
export async function getAnnouncements(limit = 6): Promise<Announcement[]> {
  const today = sgDate();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("announcements")
    .select("id, title, body, date, register_by, registration_link")
    .or(`date.gte.${today},register_by.gte.${today}`);
  if (error) console.error("getAnnouncements failed", error);

  const nextDate = (a: Announcement) =>
    [a.register_by, a.date].filter((d): d is string => !!d && d >= today).sort()[0];

  return (data ?? [])
    .sort((a, b) => nextDate(a).localeCompare(nextDate(b)) || a.date.localeCompare(b.date))
    .slice(0, limit);
}

export type AdminEvent = ChurchEvent & { attendance: { count: number }[] };

export type EventFilters = {
  location?: string; // location code; empty = all
  from?: string; // YYYY-MM-DD (SGT), inclusive
  to?: string; // YYYY-MM-DD (SGT), inclusive
};

export const ADMIN_EVENTS_LIMIT = 300;

/** All events matching the filters, with attendee counts (admins only, via RLS). */
export async function getEventsForAdmin({ location, from, to }: EventFilters): Promise<AdminEvent[]> {
  const supabase = await createClient();
  let query = supabase
    .from("events")
    .select(`${EVENT_COLUMNS}, attendance(count)`)
    .order("starts_at")
    .limit(ADMIN_EVENTS_LIMIT);

  if (location) query = query.eq("location_code", location);
  if (from) query = query.gte("starts_at", `${from}T00:00:00+08:00`);
  if (to) query = query.lt("starts_at", nextDayStartSgt(to));

  const { data, error } = await query;
  if (error) console.error("getEventsForAdmin failed", error);
  return (data as AdminEvent[] | null) ?? [];
}

function nextDayStartSgt(date: string) {
  const d = new Date(`${date}T00:00:00+08:00`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}
