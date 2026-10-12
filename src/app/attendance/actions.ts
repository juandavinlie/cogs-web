"use server";

import { redirect } from "next/navigation";
import { getOngoingEvents } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

export async function recordAttendance(formData: FormData) {
  // Keep the visitor's ?location= filter when sending them back with an error.
  const filter = String(formData.get("location") ?? "");
  const base = filter ? `/attendance?location=${encodeURIComponent(filter)}` : "/attendance";
  const fail: (msg: string) => never = (msg) =>
    redirect(`${base}${filter ? "&" : "?"}error=${encodeURIComponent(msg)}`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(base)}`);

  // Re-check on the server: the event must require attendance and be open for check-in now.
  // (The database enforces the same rule.) The location comes from the event itself.
  const eventId = String(formData.get("event") ?? "");
  const event = (await getOngoingEvents()).find((e) => e.id === eventId);
  if (!event) fail("That event isn't open for check-in right now. Please choose from the list.");

  const { data, error } = await supabase
    .from("attendance")
    .insert({ user_id: user.id, event_id: event.id, location_code: event.location_code })
    .select("id")
    .single();

  if (error?.code === "23505") {
    // Already checked in to this event. Show the existing record.
    const { data: existing } = await supabase
      .from("attendance")
      .select("id")
      .eq("user_id", user.id)
      .eq("event_id", event.id)
      .single();
    if (existing) redirect(`/attendance/confirmed?id=${existing.id}&already=1`);
  }
  if (error?.code === "42501") fail("That event isn't open for check-in right now.");
  if (error || !data) {
    console.error("recordAttendance failed", error);
    fail("Something went wrong saving your attendance. Please try again.");
  }

  redirect(`/attendance/confirmed?id=${data.id}`);
}
