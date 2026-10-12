"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { Field, Notice, Select } from "@/components/ui";
import type { Location } from "@/lib/data";

export default function SignupForm({ locations, next }: { locations: Location[]; next: string }) {
  const [state, action] = useActionState<SignUpState, FormData>(signUp, {});
  const v = state.values;

  return (
    // key: remount with the returned values after a failed submit (passwords are intentionally cleared).
    <form key={JSON.stringify(v ?? {})} action={action} className="space-y-4">
      <Notice error={state.error} />
      <input type="hidden" name="next" value={next} />
      <Field label="Full name" name="name" autoComplete="name" required maxLength={100} defaultValue={v?.name} />
      <Field label="Email" name="email" type="email" autoComplete="email" required defaultValue={v?.email} />
      <Select label="Location" name="location" required defaultValue={v?.location ?? ""}>
        <option value="" disabled>Choose your location</option>
        {locations.map((l) => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </Select>
      <Field label="Password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
