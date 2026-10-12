import type { Metadata } from "next";
import { AuthCard, TextLink, param, type SearchParams } from "@/components/ui";
import { getMemberLocations } from "@/lib/data";
import { safeNext } from "@/lib/redirect";
import SignupForm from "./SignupForm";

export const metadata: Metadata = { title: "Create account" };

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const next = safeNext(param(sp, "next"));
  const locations = await getMemberLocations();

  return (
    <AuthCard title="Create an account" subtitle="We'll send you an email to verify your address.">
      <SignupForm locations={locations} next={next} />
      <p className="text-sm">
        Already have an account? <TextLink href="/login">Log in</TextLink>
      </p>
    </AuthCard>
  );
}
