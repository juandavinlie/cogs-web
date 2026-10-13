import type { Metadata } from "next";
import { TextLink } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { sgDate } from "@/lib/time";
import AddAnnouncementForm from "./AddAnnouncementForm";

export const metadata: Metadata = { title: "Add announcement" };

export default async function AddAnnouncementPage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <TextLink href="/announcements">← Back to announcements</TextLink>
      <h1 className="mt-3 font-serif text-2xl font-semibold">Add announcement</h1>
      <div className="mt-6">
        <AddAnnouncementForm today={sgDate()} />
      </div>
    </div>
  );
}
