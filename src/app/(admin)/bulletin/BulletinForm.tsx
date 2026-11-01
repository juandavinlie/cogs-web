"use client";

import { useActionState, useState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Field, Notice, inputClass } from "@/components/ui";
import type { ParsedAnnouncement, ParsedBulletin } from "@/lib/bulletin/parse";
import { parseBulletinPdf, publishBulletin, type ParseState, type PublishState } from "./actions";

function AnnouncementEditor({
  index,
  value,
  onChange,
  onRemove,
}: {
  index: number;
  value: ParsedAnnouncement;
  onChange: (next: ParsedAnnouncement) => void;
  onRemove: () => void;
}) {
  const set = (patch: Partial<ParsedAnnouncement>) => onChange({ ...value, ...patch });

  return (
    <li className="space-y-3 rounded-xl border border-line bg-white p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-muted">Announcement {index + 1}</p>
        <button type="button" onClick={onRemove} className="text-sm font-medium text-red-700 hover:underline">
          Remove
        </button>
      </div>
      <Field label="Title" value={value.title} onChange={(e) => set({ title: e.target.value })} required />
      <label className="block">
        <span className="text-sm font-medium">Full announcement</span>
        <textarea rows={6} value={value.body} onChange={(e) => set({ body: e.target.value })} className={inputClass} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date (optional)" type="date" value={value.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} />
        <Field label="Register by (optional)" type="date" value={value.register_by ?? ""} onChange={(e) => set({ register_by: e.target.value || null })} />
      </div>
      <Field
        label="Registration link (optional)"
        type="url"
        value={value.registration_link ?? ""}
        onChange={(e) => set({ registration_link: e.target.value || null })}
      />
    </li>
  );
}

function ReviewForm({ parsed, fileName }: { parsed: ParsedBulletin; fileName?: string }) {
  const [state, action] = useActionState<PublishState, FormData>(publishBulletin, {});
  const [announcements, setAnnouncements] = useState(parsed.announcements);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const ok = confirm(`Update the site?\n\nThis deletes ALL current announcements and replaces them with these ${announcements.length}.`);
        if (!ok) e.preventDefault();
      }}
      className="mt-8 space-y-8"
    >
      <div>
        <h2 className="font-serif text-xl font-semibold">Review</h2>
        <p className="mt-1 text-sm text-muted">From {fileName}. Check everything, and edit anything that needs fixing. Nothing changes until you update.</p>
      </div>

      {parsed.warnings.length > 0 && (
        <div role="status" className="rounded-lg border border-accent/30 bg-accent/10 px-4 py-3 text-sm">
          <p className="font-medium">Please check these:</p>
          <ul className="mt-1 list-disc pl-5">
            {parsed.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <section className="space-y-3">
        <h3 className="font-semibold">Bulletin details</h3>
        <Field label="Date" name="date" type="date" required defaultValue={parsed.date ?? ""} />
        <Field label="Message title" name="messageTitle" defaultValue={parsed.messageTitle ?? ""} />
      </section>

      <section className="space-y-2">
        <h3 className="font-semibold">Prayer burdens</h3>
        <p className="text-sm text-muted">Stored as Markdown: ## and ### are headings, - is a bullet, and **text** is bold.</p>
        <textarea name="prayerBurdens" rows={16} defaultValue={parsed.prayerBurdens ?? ""} className={`${inputClass} font-mono text-sm`} />
      </section>

      <section className="space-y-3">
        <h3 className="font-semibold">Announcements ({announcements.length})</h3>
        <ul className="space-y-4">
          {announcements.map((a, i) => (
            <AnnouncementEditor
              key={i}
              index={i}
              value={a}
              onChange={(next) => setAnnouncements((all) => all.map((x, j) => (j === i ? next : x)))}
              onRemove={() => setAnnouncements((all) => all.filter((_, j) => j !== i))}
            />
          ))}
        </ul>
      </section>

      <input type="hidden" name="announcements" value={JSON.stringify(announcements)} />
      <Notice error={state.error} />
      <SubmitButton pendingText="Updating…">Update</SubmitButton>
    </form>
  );
}

export default function BulletinForm() {
  const [state, action] = useActionState<ParseState, FormData>(parseBulletinPdf, {});

  return (
    <>
      <form action={action} className="mt-6 space-y-4 rounded-xl border border-line bg-white p-4">
        <Field label="Weekly announcements PDF" name="file" type="file" accept="application/pdf,.pdf" required />
        <Notice error={state.error} />
        <SubmitButton pendingText="Reading PDF…">Read PDF</SubmitButton>
      </form>

      {/* key: uploading another PDF starts a fresh review. */}
      {state.parsed && <ReviewForm key={JSON.stringify(state.parsed)} parsed={state.parsed} fileName={state.fileName} />}
    </>
  );
}
