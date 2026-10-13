"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { safeNext } from "@/lib/redirect";
import { createClient } from "@/lib/supabase/server";
import { isDate, withParam } from "@/lib/url";

export async function deleteAnnouncement(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const returnTo = safeNext(formData.get("returnTo"), "/announcements");

  const supabase = await createClient();
  // RLS silently deletes nothing for non-admins, so check that a row actually went.
  const { data, error } = await supabase.from("announcements").delete().eq("id", id).select("title");

  revalidatePath("/", "layout");
  if (error || !data?.length) {
    if (error) console.error("deleteAnnouncement failed", error);
    redirect(withParam(returnTo, "error", "Couldn't delete that announcement. It may have already been removed."));
  }
  redirect(withParam(returnTo, "message", `Deleted “${data[0].title}”.`));
}

export type AddAnnouncementValues = {
  title: string;
  body: string;
  date: string;
  registerBy: string;
  registrationLink: string;
};

export type AddAnnouncementState = { error?: string; values?: AddAnnouncementValues };

export async function addAnnouncement(_prev: AddAnnouncementState, formData: FormData): Promise<AddAnnouncementState> {
  await requireAdmin();

  const values: AddAnnouncementValues = {
    title: String(formData.get("title") ?? "").trim(),
    body: String(formData.get("body") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    registerBy: String(formData.get("registerBy") ?? ""),
    registrationLink: String(formData.get("registrationLink") ?? "").trim(),
  };
  const fail = (error: string): AddAnnouncementState => ({ error, values });

  if (!values.title) return fail("Please enter a title.");
  if (!isDate(values.date)) return fail("Please choose a date.");
  if (values.registerBy && !isDate(values.registerBy)) return fail("That register-by date isn't valid.");
  if (values.registerBy && values.registerBy > values.date) {
    return fail("The register-by date should be on or before the announcement date.");
  }
  if (values.registrationLink && !/^https?:\/\/\S+\.\S+/i.test(values.registrationLink)) {
    return fail("The registration link should be a full web address starting with https://");
  }
  if (values.registerBy && !values.registrationLink) {
    return fail("Add a registration link, or clear the register-by date.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({
    title: values.title,
    body: values.body,
    date: values.date,
    register_by: values.registerBy || null,
    registration_link: values.registrationLink || null,
  });

  if (error) {
    console.error("addAnnouncement failed", error);
    return fail(
      error.code === "42501" ? "You don't have permission to add announcements." : "Couldn't save the announcement. Please try again.",
    );
  }

  revalidatePath("/", "layout");
  redirect(`/announcements?${new URLSearchParams({ message: `Added “${values.title}”.` })}`);
}
