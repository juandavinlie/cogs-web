import type { Metadata } from "next";
import { logIn } from "@/app/auth/actions";
import SubmitButton from "@/components/SubmitButton";
import { AuthCard, Field, Notice, TextLink, param, type SearchParams } from "@/components/ui";
import { safeNext } from "@/lib/redirect";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNext(param(sp, "next"));
  // Carry ?location= through to sign-up, whether it's on this URL or inside `next`
  // (e.g. a logged-out visitor sent here from /attendance?location=rhe).
  const location = param(sp, "location") ?? new URL(next, "http://x").searchParams.get("location") ?? undefined;
  const signupQuery = new URLSearchParams();
  if (next !== "/") signupQuery.set("next", next);
  if (location) signupQuery.set("location", location);
  const signupHref = `/signup${signupQuery.size ? `?${signupQuery}` : ""}`;

  return (
    <AuthCard title="Log in" subtitle="Welcome back.">
      <Notice error={param(sp, "error")} message={param(sp, "message")} />
      <form action={logIn} className="space-y-4">
        <input type="hidden" name="next" value={next} />
        <Field label="Email" name="email" placeholder="e.g. simon.peter@example.com" type="email" autoComplete="email" required />
        <Field label="Password" name="password" placeholder="Your password" type="password" autoComplete="current-password" required />
        <SubmitButton pendingText="Logging in…">Log in</SubmitButton>
      </form>
      <div className="flex justify-between text-sm">
        <TextLink href="/forgot-password">Forgot password?</TextLink>
        <TextLink href={signupHref}>Create account</TextLink>
      </div>
    </AuthCard>
  );
}
