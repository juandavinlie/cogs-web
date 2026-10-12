import Link from "next/link";

/** Prev/next pager. `hrefFor(page)` builds the URL for a page, keeping the current filters. */
export default function Pagination({ page, pageSize, total, hrefFor }: { page: number; pageSize: number; total: number; hrefFor: (page: number) => string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);
  const btn = "rounded-lg border border-line bg-white px-4 py-2 text-sm font-medium";

  return (
    <nav className="flex items-center justify-between gap-3" aria-label="Pagination">
      <p className="text-sm text-muted">
        {first}–{last} of {total}
      </p>
      <div className="flex gap-2">
        {page > 1 ? <Link className={`${btn} hover:bg-paper`} href={hrefFor(page - 1)}>← Prev</Link> : <span className={`${btn} opacity-40`}>← Prev</span>}
        {page < pages ? <Link className={`${btn} hover:bg-paper`} href={hrefFor(page + 1)}>Next →</Link> : <span className={`${btn} opacity-40`}>Next →</span>}
      </div>
    </nav>
  );
}
