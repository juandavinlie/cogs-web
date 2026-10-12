import type { Metadata } from "next";
import { resendVerification } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { AuthCard, Field, Notice, TextLink, param, type SearchParams } from "@/components/ui";

export const metadata: Metadata = { title: "Check your email" };

export default async function CheckEmailPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const error = param(sp, "error");
  const message = param(sp, "message");

  return (
    <AuthCard
      title="Check your email"
      subtitle="We sent you a link to verify your email address. Open it on this device to finish signing up."
    >
      <Notice error={error} message={message} />
      <details className="rounded-lg border border-line bg-white p-4" open={Boolean(error)}>
        <summary className="cursor-pointer text-sm font-medium">Didn&apos;t get it? Resend the link</summary>
        <form action={resendVerification} className="mt-4 space-y-4">
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <SubmitButton pendingText="Sending…">Resend verification email</SubmitButton>
        </form>
      </details>
      <p className="text-sm">
        Verified already? <TextLink href="/login">Log in</TextLink>
      </p>
    </AuthCard>
  );
}
