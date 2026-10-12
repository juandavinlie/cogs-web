import type { Metadata } from "next";
import { TextLink } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { getLocations } from "@/lib/data";
import { sgDate } from "@/lib/time";
import AddEventForm from "./AddEventForm";

export const metadata: Metadata = { title: "Add event" };

export default async function AddEventPage() {
  await requireAdmin();
  const locations = await getLocations();

  return (
    <div className="mx-auto w-full max-w-md px-4 py-8">
      <TextLink href="/events">← Back to events</TextLink>
      <h1 className="mt-3 font-serif text-2xl font-semibold">Add event</h1>
      <div className="mt-6">
        <AddEventForm locations={locations} today={sgDate()} />
      </div>
    </div>
  );
}
