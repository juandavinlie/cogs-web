// Queries for admin pages. RLS only returns all rows to admins.
import type { Announcement } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export const PAGE_SIZE = 25;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (v?: string): v is string => !!v && UUID.test(v);

/** For ilike filters: treat the admin's text literally (escape % and _). */
const contains = (q: string) => `%${q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

const range = (page: number) => [(page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1] as const;

export type Member = {
  id: string;
  full_name: string | null;
  email: string | null;
  role: "member" | "admin";
  location_code: string | null;
  created_at: string;
  locations: { name: string } | null;
};

export async function getMembers(f: { name?: string; email?: string; location?: string; page: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, role, location_code, created_at, locations(name)", { count: "exact" })
    .order("full_name", { ascending: true, nullsFirst: false })
    .order("email")
    .range(...range(f.page));

  if (f.name) query = query.ilike("full_name", contains(f.name));
  if (f.email) query = query.ilike("email", contains(f.email));
  if (f.location) query = query.eq("location_code", f.location);

  const { data, count, error } = await query;
  if (error) console.error("getMembers failed", error);
  return { rows: (data as Member[] | null) ?? [], total: count ?? 0 };
}

export type AttendanceRecord = {
  id: string;
  created_at: string;
  location_code: string;
  events: { id: string; name: string; starts_at: string; ends_at: string; locations: { name: string } | null };
  profiles: { full_name: string | null; email: string | null; location_code: string | null; locations: { name: string } | null };
};

export async function getAttendanceRecords(f: { location?: string; userLocation?: string; eventId?: string; page: number }) {
  const supabase = await createClient();
  let query = supabase
    .from("attendance")
    .select(
      `id, created_at, location_code,
       events!inner(id, name, starts_at, ends_at, locations(name)),
       profiles!inner(full_name, email, location_code, locations(name))`,
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(...range(f.page));

  if (f.location) query = query.eq("location_code", f.location);
  if (f.userLocation) query = query.eq("profiles.location_code", f.userLocation);
  if (isUuid(f.eventId)) query = query.eq("event_id", f.eventId);

  const { data, count, error } = await query;
  if (error) console.error("getAttendanceRecords failed", error);
  return { rows: (data as unknown as AttendanceRecord[] | null) ?? [], total: count ?? 0 };
}

export type EventOption = { id: string; name: string; starts_at: string; locations: { name: string } | null };

/**
 * Events that take attendance, for the event filter dropdown: the most recent
 * `limit` events, listed by date and time ascending.
 */
export async function getAttendanceEventOptions(limit = 500): Promise<EventOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("id, name, starts_at, locations(name)")
    .eq("requires_attendance", true)
    .order("starts_at", { ascending: false })
    .order("name", { ascending: false })
    .limit(limit);
  if (error) console.error("getAttendanceEventOptions failed", error);
  return ((data as EventOption[] | null) ?? []).reverse();
}

/** Parses ?page=, defaulting to 1. */
export function pageParam(v?: string) {
  const n = Number.parseInt(v ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Builds "?a=1&b=2" from the non-empty entries. */
export function toQuery(params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams(
    Object.entries(params).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]])),
  ).toString();
  return qs ? `?${qs}` : "";
}

export const ADMIN_ANNOUNCEMENTS_LIMIT = 300;

/**
 * Announcements whose date or registration deadline falls within [from, to]
 * (either bound optional), soonest date first.
 */
export async function getAnnouncementsForAdmin({ from, to }: { from?: string; to?: string }): Promise<Announcement[]> {
  const inRange = (col: string) =>
    [from && `${col}.gte.${from}`, to && `${col}.lte.${to}`].filter(Boolean).join(",");

  const supabase = await createClient();
  let query = supabase
    .from("announcements")
    .select("id, title, body, date, register_by, registration_link")
    .order("date")
    .order("title")
    .limit(ADMIN_ANNOUNCEMENTS_LIMIT);
  if (from || to) query = query.or(`and(${inRange("date")}),and(${inRange("register_by")})`);

  const { data, error } = await query;
  if (error) console.error("getAnnouncementsForAdmin failed", error);
  return data ?? [];
}
