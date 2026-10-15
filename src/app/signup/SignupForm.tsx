"use client";

import { useActionState } from "react";
import { signUp, type SignUpState } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { Field, Notice, Select } from "@/components/ui";
import type { Location } from "@/lib/data";

export default function SignupForm({
  locations,
  next,
  defaultLocation,
}: {
  locations: Location[];
  next: string;
  defaultLocation?: string;
}) {
  const [state, action] = useActionState<SignUpState, FormData>(signUp, {});
  const v = state.values;

  return (
    // key: remount with the returned values after a failed submit (passwords are intentionally cleared).
    <form key={JSON.stringify(v ?? {})} action={action} className="space-y-4">
      <Notice error={state.error} />
      <input type="hidden" name="next" value={next} />
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="First name"
          name="firstName"
          placeholder="e.g. Simon"
          autoComplete="given-name"
          required
          maxLength={50}
          defaultValue={v?.firstName}
        />
        <Field
          label="Last name"
          name="lastName"
          placeholder="e.g. Peter"
          autoComplete="family-name"
          required
          maxLength={50}
          defaultValue={v?.lastName}
        />
      </div>
      <Field label="Email" name="email" placeholder="e.g. simon.peter@example.com" type="email" autoComplete="email" required defaultValue={v?.email} />
      <Select label="Location" name="location" required defaultValue={v?.location ?? defaultLocation ?? ""}>
        <option value="" disabled>Choose your location</option>
        {locations.map((l) => (
          <option key={l.code} value={l.code}>{l.name}</option>
        ))}
      </Select>
      <Field label="Password" name="password" placeholder="At least 8 characters" type="password" autoComplete="new-password" minLength={8} required />
      <Field label="Confirm password" name="confirm" placeholder="Re-enter your password" type="password" autoComplete="new-password" minLength={8} required />
      <SubmitButton pendingText="Creating account…">Create account</SubmitButton>
    </form>
  );
}
