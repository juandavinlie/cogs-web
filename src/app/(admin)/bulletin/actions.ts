"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { parseBulletin, type ParsedAnnouncement, type ParsedBulletin } from "@/lib/bulletin/parse";
import { createClient } from "@/lib/supabase/server";
import { isDate } from "@/lib/url";

const MAX_BYTES = 4 * 1024 * 1024;

export type ParseState = { error?: string; parsed?: ParsedBulletin; fileName?: string };

export async function parseBulletinPdf(_prev: ParseState, formData: FormData): Promise<ParseState> {
  await requireAdmin();

  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) return { error: "Please choose a PDF file." };
  if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) return { error: "That file isn't a PDF." };
  if (file.size > MAX_BYTES) return { error: "That file is over 4 MB. Please upload a smaller PDF." };

  try {
    const parsed = await parseBulletin(new Uint8Array(await file.arrayBuffer()));
    if (!parsed.announcements.length && !parsed.prayerBurdens) {
      return { error: "Couldn't find any bulletin sections in that PDF. Is it the weekly announcements?" };
    }
    return { parsed, fileName: file.name };
  } catch (error) {
    console.error("parseBulletinPdf failed", error);
    return { error: "Couldn't read that PDF. It may be damaged or password protected." };
  }
}

export type PublishState = { error?: string };

const isValidOptionalDate = (v: string | null) => !v || !!isDate(v);

export async function publishBulletin(_prev: PublishState, formData: FormData): Promise<PublishState> {
  await requireAdmin();

  const bulletinDate = String(formData.get("date") ?? "");
  const messageTitle = String(formData.get("messageTitle") ?? "").trim();
  const prayerBurdens = String(formData.get("prayerBurdens") ?? "").trim();

  let announcements: ParsedAnnouncement[];
  try {
    announcements = JSON.parse(String(formData.get("announcements") ?? "[]"));
  } catch {
    return { error: "Couldn't read the announcements. Please try again." };
  }

  if (!isDate(bulletinDate)) return { error: "Please enter the bulletin date." };
  if (!announcements.length) return { error: "There are no announcements, so nothing was changed." };

  for (const [i, a] of announcements.entries()) {
    const label = `Announcement ${i + 1}`;
    if (!a.title.trim()) return { error: `${label} needs a title.` };
    if (!isValidOptionalDate(a.date) || !isValidOptionalDate(a.register_by)) return { error: `${label} has an invalid date.` };
    if (a.registration_link && !/^https?:\/\/\S+$/i.test(a.registration_link)) {
      return { error: `${label}: the registration link must be a full web address starting with https://` };
    }
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("publish_bulletin", {
    p_bulletin_date: bulletinDate,
    p_message_title: messageTitle || null,
    p_prayer_burdens: prayerBurdens,
    p_announcements: announcements,
  });

  if (error) {
    console.error("publishBulletin failed", error);
    return { error: "Couldn't update the site, so nothing was changed. Please try again." };
  }

  revalidatePath("/", "layout");
  redirect(`/announcements?${new URLSearchParams({ message: `Bulletin published with ${announcements.length} announcements.` })}`);
}
