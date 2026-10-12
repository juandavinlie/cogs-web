import type { Metadata } from "next";
import { requestPasswordReset } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { AuthCard, Field, Notice, TextLink, param, type SearchParams } from "@/components/ui";

export const metadata: Metadata = { title: "Reset password" };

export default async function ForgotPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  return (
    <AuthCard title="Forgot your password?" subtitle="Enter your email and we'll send you a link to set a new one.">
      <Notice error={param(sp, "error")} message={param(sp, "message")} />
      <form action={requestPasswordReset} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <SubmitButton pendingText="Sending…">Send reset link</SubmitButton>
      </form>
      <p className="text-sm">
        <TextLink href="/login">Back to log in</TextLink>
      </p>
    </AuthCard>
  );
}
