import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import BulletinForm from "./BulletinForm";

export const metadata: Metadata = { title: "Bulletin" };

export default async function BulletinPage() {
  await requireAdmin();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold">Weekly bulletin</h1>
      <p className="mt-1 text-sm text-muted">
        Upload the weekly announcements PDF to update the prayer burdens and replace all announcements on the site.
      </p>
      <BulletinForm />
    </div>
  );
}
