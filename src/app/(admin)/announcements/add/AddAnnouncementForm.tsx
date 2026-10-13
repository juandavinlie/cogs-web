"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Field, Notice, inputClass } from "@/components/ui";
import { addAnnouncement, type AddAnnouncementState } from "../actions";

export default function AddAnnouncementForm({ today }: { today: string }) {
  const [state, action] = useActionState<AddAnnouncementState, FormData>(addAnnouncement, {});
  const v = state.values;

  return (
    // key: remount with the returned values after a failed submit, so nothing the admin typed is lost.
    <form key={JSON.stringify(v ?? {})} action={action} className="space-y-4">
      <Notice error={state.error} />

      <Field label="Title" name="title" required maxLength={120} defaultValue={v?.title} placeholder="e.g. Church Camp 2026" />

      <label className="block">
        <span className="text-sm font-medium">
          Details <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="body"
          rows={4}
          maxLength={2000}
          defaultValue={v?.body}
          placeholder="e.g. Three days of worship, fellowship and rest. Open to all ages."
          className={inputClass}
        />
      </label>

      <div>
        <Field label="Date" name="date" type="date" required defaultValue={v?.date ?? today} />
        <p className="mt-1 text-sm text-muted">The date the announcement is about. It shows on the home page until then.</p>
      </div>

      <fieldset className="space-y-4 rounded-lg border border-line bg-white p-4">
        <legend className="px-1 text-sm font-medium">
          Registration <span className="font-normal text-muted">(optional)</span>
        </legend>
        <Field
          label="Registration link"
          name="registrationLink"
          type="url"
          inputMode="url"
          defaultValue={v?.registrationLink}
          placeholder="e.g. https://forms.gle/your-form"
        />
        <div>
          <Field label="Register by" name="registerBy" type="date" defaultValue={v?.registerBy} />
          <p className="mt-1 text-sm text-muted">The Register button is hidden after this date.</p>
        </div>
      </fieldset>

      <SubmitButton pendingText="Saving…">Add announcement</SubmitButton>
    </form>
  );
}
