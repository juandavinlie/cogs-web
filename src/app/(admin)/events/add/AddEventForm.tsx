"use client";

import { useActionState } from "react";
import SubmitButton from "@/components/SubmitButton";
import { Field, Notice } from "@/components/ui";
import type { Location } from "@/lib/data";
import { addEvent, type AddEventState } from "../actions";

export default function AddEventForm({ locations, today }: { locations: Location[]; today: string }) {
  const [state, action] = useActionState<AddEventState, FormData>(addEvent, {});
  const v = state.values;

  return (
    // key: remount with the returned values after a failed submit, so nothing the admin typed is lost.
    <form key={JSON.stringify(v ?? {})} action={action} className="space-y-4">
      <Notice error={state.error} />

      <Field label="Name" name="name" required maxLength={120} defaultValue={v?.name} placeholder="e.g. Sunday Worship" />

      <label className="block">
        <span className="text-sm font-medium">Location</span>
        <select
          name="location"
          required
          defaultValue={v?.location ?? ""}
          className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        >
          <option value="" disabled>Choose a location</option>
          {locations.map((l) => (
            <option key={l.code} value={l.code}>{l.name}</option>
          ))}
        </select>
      </label>

      <Field label="Date" name="date" type="date" required defaultValue={v?.date ?? today} />

      <div className="grid grid-cols-2 gap-3">
        <Field label="Start time (SGT)" name="start" type="time" required defaultValue={v?.start} />
        <Field label="End time (SGT)" name="end" type="time" required defaultValue={v?.end} />
      </div>

      <label className="block">
        <span className="text-sm font-medium">
          Description <span className="font-normal text-muted">(optional)</span>
        </span>
        <textarea
          name="description"
          placeholder="e.g. Join us for worship and the Word. Lunch provided after service."
          rows={3}
          maxLength={1000}
          defaultValue={v?.description}
          className="mt-1 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
      </label>

      <label className="flex items-start gap-3 rounded-lg border border-line bg-white p-4">
        <input type="checkbox" name="requiresAttendance" defaultChecked={v?.requiresAttendance} className="mt-0.5 size-5 accent-brand" />
        <span>
          <span className="block font-medium">Requires attendance</span>
          <span className="block text-sm text-muted">Members can check in from 30 minutes before the start until the end.</span>
        </span>
      </label>

      <SubmitButton pendingText="Saving…">Add event</SubmitButton>
    </form>
  );
}
