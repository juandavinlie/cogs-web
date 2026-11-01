"use client";

import { useRef } from "react";

export default function PrayerBurdensDialog({ subtitle, children }: { subtitle: string; children: React.ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = () => dialog.current?.close();

  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        className="rounded-full bg-brand px-5 py-2.5 font-medium text-white hover:bg-brand-dark"
      >
        View prayer burdens
      </button>

      <dialog
        ref={dialog}
        aria-label="Prayer burdens"
        onClick={(e) => {
          if (e.target === dialog.current) close(); // Clicked the backdrop
        }}
        className="m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-xl bg-white p-0 text-ink shadow-xl backdrop:bg-black/50"
      >
        <div className="sticky top-0 flex items-start justify-between gap-4 border-b border-line bg-white px-6 py-4">
          <div>
            <h3 className="font-serif text-xl font-semibold">Prayer burdens</h3>
            <p className="mt-0.5 text-sm text-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="-mr-1 -mt-1 shrink-0 rounded-full px-2 text-2xl leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </dialog>
    </>
  );
}
