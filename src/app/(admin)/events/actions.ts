"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getLocation } from "@/lib/data";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";

function withParam(path: string, key: string, value: string) {
  const url = new URL(path, "http://x");
  url.searchParams.set(key, value);
  return url.pathname + url.search;
}

export async function deleteEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const returnTo = safeNext(formData.get("returnTo"), "/events");

  const supabase = await createClient();
  // RLS silently deletes nothing for non-admins, so check that a row actually went.
  const { data, error } = await supabase.from("events").delete().eq("id", id).select("name");

  revalidatePath("/", "layout");
  if (error || !data?.length) {
    if (error) console.error("deleteEvent failed", error);
    redirect(withParam(returnTo, "error", "Couldn't delete that event. It may have already been removed."));
  }
  redirect(withParam(returnTo, "message", `Deleted “${data[0].name}”.`));
}

export type AddEventValues = {
  name: string;
  location: string;
  date: string;
  start: string;
  end: string;
  description: string;
  requiresAttendance: boolean;
};

export type AddEventState = { error?: string; values?: AddEventValues };

export async function addEvent(_prev: AddEventState, formData: FormData): Promise<AddEventState> {
  await requireAdmin();

  const values: AddEventValues = {
    name: String(formData.get("name") ?? "").trim(),
    location: String(formData.get("location") ?? ""),
    date: String(formData.get("date") ?? ""),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    requiresAttendance: formData.get("requiresAttendance") === "on",
  };
  const fail = (error: string): AddEventState => ({ error, values });

  if (!values.name) return fail("Please enter a name.");
  if (!(await getLocation(values.location))) return fail("Please choose a location.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) return fail("Please choose a date.");
  if (!/^\d{2}:\d{2}$/.test(values.start) || !/^\d{2}:\d{2}$/.test(values.end)) {
    return fail("Please enter a start and end time.");
  }
  if (values.end <= values.start) return fail("End time must be after the start time.");

  // Times are entered in Singapore time.
  const startsAt = new Date(`${values.date}T${values.start}:00+08:00`);
  const endsAt = new Date(`${values.date}T${values.end}:00+08:00`);
  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) return fail("That date or time isn't valid.");

  const supabase = await createClient();
  const { error } = await supabase.from("events").insert({
    name: values.name,
    location_code: values.location,
    description: values.description || null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    requires_attendance: values.requiresAttendance,
  });

  if (error) {
    console.error("addEvent failed", error);
    return fail(error.code === "42501" ? "You don't have permission to add events." : "Couldn't save the event. Please try again.");
  }

  revalidatePath("/", "layout");
  redirect(`/events?${new URLSearchParams({ from: values.date, message: `Added “${values.name}”.` })}`);
}
