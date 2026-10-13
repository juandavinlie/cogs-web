import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import Pagination from "@/components/Pagination";
import { inputClass, param, type SearchParams } from "@/components/ui";
import { PAGE_SIZE, getMembers, pageParam, toQuery } from "@/lib/admin-data";
import { requireAdmin } from "@/lib/auth";
import { getMemberLocations } from "@/lib/data";
import { formatDay } from "@/lib/time";

export const metadata: Metadata = { title: "Members" };

export default async function MembersPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const filters = {
    name: param(sp, "name")?.trim() || undefined,
    email: param(sp, "email")?.trim() || undefined,
    location: param(sp, "location") || undefined,
  };
  const page = pageParam(param(sp, "page"));

  const [locations, { rows, total }] = await Promise.all([getMemberLocations(), getMembers({ ...filters, page })]);
  const filtered = Object.values(filters).some(Boolean);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-serif text-2xl font-semibold">Members</h1>

      <Form action="/members" className="mt-6 grid gap-3 rounded-xl border border-line bg-white p-4 sm:grid-cols-4 sm:items-end">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input name="name" defaultValue={filters.name} placeholder="e.g. Simon Peter" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Email</span>
          <input name="email" defaultValue={filters.email} placeholder="e.g. simon.peter@example.com" className={inputClass} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Location</span>
          <select name="location" defaultValue={filters.location ?? ""} className={inputClass}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.code} value={l.code}>{l.name}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="flex-1 rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark">Filter</button>
          {filtered && (
            <Link href="/members" className="rounded-lg border border-line px-4 py-2.5 font-medium hover:bg-paper">
              Clear
            </Link>
          )}
        </div>
      </Form>

      <div className="mt-6 space-y-4">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-line bg-white p-5 text-muted">
            {filtered ? "No members match these filters." : "No members yet."}
          </p>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white">
            {rows.map((m) => (
              <li key={m.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {m.full_name ?? <span className="text-muted italic">No name</span>}
                    {m.role === "admin" && (
                      <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 align-middle text-xs font-semibold text-accent">Admin</span>
                    )}
                  </p>
                  <p className="truncate text-sm text-muted">{m.email}</p>
                </div>
                <p className="text-sm sm:w-40">{m.locations?.name ?? <span className="text-muted">No location</span>}</p>
                <p className="text-sm text-muted sm:w-40 sm:text-right">Joined {formatDay(m.created_at)}</p>
              </li>
            ))}
          </ul>
        )}

        <Pagination page={page} pageSize={PAGE_SIZE} total={total} hrefFor={(p) => `/members${toQuery({ ...filters, page: p })}`} />
      </div>
    </div>
  );
}
