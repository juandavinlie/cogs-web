import type { Metadata } from "next";
import { logIn } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { AuthCard, Field, Notice, TextLink, param, type SearchParams } from "@/components/ui";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNext(param(sp, "next"));
  const signupHref = next === "/" ? "/signup" : `/signup?next=${encodeURIComponent(next)}`;

  return (
    <AuthCard title="Log in" subtitle="Welcome back.">
      <Notice error={param(sp, "error")} message={param(sp, "message")} />
      <form action={logIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" type="email" autoComplete="email" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
      </form>
      <div className="flex justify-between text-sm">
        <TextLink href="/forgot-password">Forgot password?</TextLink>
        <TextLink href={signupHref}>Create account</TextLink>
      </div>
    </AuthCard>
  );
}
