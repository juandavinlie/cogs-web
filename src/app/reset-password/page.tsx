import type { Metadata } from "next";
import { updatePassword } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { AuthCard, Field, Notice, TextLink, param, type SearchParams } from "@/components/ui";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Set a new password" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The reset email link signs the user in before landing here.
  if (!user) {
    return (
      <AuthCard title="Link expired" subtitle="This password reset link is invalid or has expired.">
        <TextLink href="/forgot-password">Request a new link</TextLink>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Set a new password" subtitle={`For ${user.email}`}>
      <Notice error={param(sp, "error")} />
      <form action={updatePassword} className="space-y-4">
        <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
        <SubmitButton pendingText="Saving…">Update password</SubmitButton>
      </form>
    </AuthCard>
  );
}
