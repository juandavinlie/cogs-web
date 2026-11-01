/** Placeholder cards shown while page data loads. */
export function CardsSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div role="status" aria-busy className="animate-pulse space-y-4">
      <span className="sr-only">Loading…</span>
      <div className="h-7 w-48 rounded-lg bg-line/70" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: cards }, (_, i) => (
          <div key={i} className="space-y-3 rounded-xl border border-line bg-white p-5">
            <div className="h-3 w-24 rounded bg-line/70" />
            <div className="h-4 w-2/3 rounded bg-line/70" />
            <div className="h-3 w-full rounded bg-line/50" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Full-page placeholder for loading.tsx files. */
export default function PageSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <CardsSkeleton cards={4} />
    </div>
  );
}
