"use client";

import { useFormStatus } from "react-dom";
import { deleteEvent } from "./actions";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-full border border-red-200 px-3 py-1 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
    >
      {pending ? "Deleting…" : "Delete"}
    </button>
  );
}

export default function DeleteEventButton({ id, name, attendees, returnTo }: { id: string; name: string; attendees: number; returnTo: string }) {
  return (
    <form
      action={deleteEvent}
      onSubmit={(e) => {
        const warning = attendees > 0 ? `\n\nThis will also delete ${attendees} attendance record${attendees === 1 ? "" : "s"}.` : "";
        if (!confirm(`Delete “${name}”?${warning}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button />
    </form>
  );
}
