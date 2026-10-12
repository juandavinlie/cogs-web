"use client";

import { useFormStatus } from "react-dom";

export default function SubmitButton({ children, pendingText = "Please wait…" }: { children: React.ReactNode; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="w-full rounded-lg bg-brand px-4 py-2.5 font-medium text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? pendingText : children}
    </button>
  );
}
