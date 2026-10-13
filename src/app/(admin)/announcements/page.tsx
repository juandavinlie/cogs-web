import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import ConfirmDeleteButton from "@/components/ConfirmDeleteButton";
import { Notice, inputClass, param, type SearchParams } from "@/components/ui";
import { ADMIN_ANNOUNCEMENTS_LIMIT, getAnnouncementsForAdmin, toQuery } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { registrationOpen } from "@/lib/data";
import { formatDateOnly, sgDate } from "@/lib/time";
import { isDate } from "@/lib/url";
import { deleteAnnouncement } from "./actions";

export const metadata: Metadata = { title: "Manage announcements" };

export default async function AnnouncementsAdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const today = sgDate();

  // Default to current ones: date or registration deadline from today onward.
  const filters = {
    from: "from" in sp ? isDate(param(sp, "from")) : today,
    to: isDate(param(sp, "to")),
  };

  const announcements = await getAnnouncementsForAdmin(filters);
  const returnTo = `/announcements${toQuery(filters)}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-semibold">Announcements</h1>
        <Link href="/announcements/add" className="rounded-full bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark">
          + Add announcement
        </Link>
      </div>

      <Form action="/announcements" className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-3 sm:items-end">
        <label className="block">
          <span className="text-sm font-medium">From</span>
          <input type="date" name="from" defaultValue={filters.from ?? ""} className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">To</span>
          <input type="date" name="to" defaultValue={filters.to ?? ""} className={inputClass} />
        </label>
        <div className="col-span-2 flex gap-2 sm:col-span-1">
          <button className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark">Filter</button>
          <Link href="/announcements?from=" className="rounded-lg border border-line px-4 py-2.5 text-center font-medium hover:bg-paper">
            All
          </Link>
        </div>
      </Form>

      <div className="mt-6 space-y-4">
        <Notice error={param(sp, "error")} message={param(sp, "message")} />

        <p className="text-sm text-muted">
          {announcements.length === ADMIN_ANNOUNCEMENTS_LIMIT
            ? `Showing the first ${ADMIN_ANNOUNCEMENTS_LIMIT} announcements. Narrow the dates to see more.`
            : `${announcements.length} announcement${announcements.length === 1 ? "" : "s"}`}
          {" · "}matched by date or register-by date
        </p>

        {announcements.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-muted">No announcements match these dates.</p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {announcements.map((a) => {
              const past = a.date < today && !(a.register_by && a.register_by >= today);
              return (
                <li key={a.id} className={`flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start ${past ? "opacity-60" : ""}`}>
                  <p className="font-medium sm:w-48 sm:shrink-0">{formatDateOnly(a.date)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    {a.body && <p className="mt-1 line-clamp-2 text-sm text-muted">{a.body}</p>}
                    {a.registration_link && (
                      <p className="mt-2 text-sm">
                        <a
                          href={a.registration_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="break-all text-brand underline-offset-2 hover:underline"
                        >
                          {a.registration_link}
                        </a>
                        {a.register_by && (
                          <span className={registrationOpen(a, today) ? "text-muted" : "text-red-700"}>
                            {" · "}
                            {registrationOpen(a, today) ? "register by" : "registration closed"} {formatDateOnly(a.register_by)}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <ConfirmDeleteButton
                    action={deleteAnnouncement}
                    id={a.id}
                    returnTo={returnTo}
                    confirmMessage={`Delete “${a.title}”?`}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
