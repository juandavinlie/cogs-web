"use client";

import { useFormStatus } from "react-dom";

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

/** Delete button that asks for confirmation, then posts `id` and `returnTo` to a server action. */
export default function ConfirmDeleteButton({
  action,
  id,
  confirmMessage,
  returnTo,
}: {
  action: (formData: FormData) => Promise<void>;
  id: string;
  confirmMessage: string;
  returnTo: string;
}) {
  return (
    <form action={action} onSubmit={(e) => !confirm(confirmMessage) && e.preventDefault()}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <Button />
    </form>
  );
}
