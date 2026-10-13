"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/events", label: "Events" },
  { href: "/announcements", label: "Announcements" },
  { href: "/members", label: "Members" },
  { href: "/attendance_records", label: "Attendance" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="border-b border-line bg-white" aria-label="Admin">
      <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4">
        {TABS.map((t) => {
          const active = pathname === t.href || pathname.startsWith(`${t.href}/`);
          return (
            <Link
              key={t.href}
              href={t.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium ${
                active ? "border-brand text-brand" : "border-transparent text-muted hover:text-ink"
              }`}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
