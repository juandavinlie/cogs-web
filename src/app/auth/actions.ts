"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { COMBINED_LOCATION_CODE, getLocation } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/redirect";

async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

function back(path: string, params: Record<string, string>): never {
  redirect(`${path}?${new URLSearchParams(params)}`);
}

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export async function logIn(formData: FormData) {
  const email = field(formData, "email");
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    if (error.code === "email_not_confirmed") {
      back("/check-email", { error: "Please verify your email first. You can resend the link below." });
    }
    back("/login", { error: "Incorrect email or password.", next });
  }
  redirect(next);
}

export type SignUpValues = { name: string; email: string; location: string };
export type SignUpState = { error?: string; values?: SignUpValues };

export async function signUp(_prev: SignUpState, formData: FormData): Promise<SignUpState> {
  const values: SignUpValues = {
    name: field(formData, "name"),
    email: field(formData, "email"),
    location: field(formData, "location"),
  };
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  const next = safeNext(formData.get("next"));
  const fail = (error: string): SignUpState => ({ error, values });

  if (!values.name) return fail("Please enter your name.");
  if (!values.location || values.location === COMBINED_LOCATION_CODE || !(await getLocation(values.location))) {
    return fail("Please choose your location.");
  }
  if (password.length < 8) return fail("Password must be at least 8 characters.");
  if (password !== confirm) return fail("Passwords don't match.");

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password,
    options: {
      emailRedirectTo: `${await siteUrl()}/auth/confirm?next=${encodeURIComponent(next)}`,
      // Copied into public.profiles by the handle_new_user trigger.
      data: { full_name: values.name, location_code: values.location },
    },
  });

  if (error) return fail(error.message);
  redirect("/check-email");
}

export async function resendVerification(formData: FormData) {
  const email = field(formData, "email");
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${await siteUrl()}/auth/confirm?next=/` },
  });
  if (error) back("/check-email", { error: error.message });
  back("/check-email", { message: "If that account needs verifying, a new link is on its way." });
}

export async function requestPasswordReset(formData: FormData) {
  const email = field(formData, "email");
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${await siteUrl()}/auth/confirm?next=/reset-password`,
  });
  // Same message either way, so the form doesn't reveal which emails have accounts.
  back("/forgot-password", { message: "If an account exists for that email, a reset link is on its way." });
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < 8) back("/reset-password", { error: "Password must be at least 8 characters." });
  if (password !== confirm) back("/reset-password", { error: "Passwords don't match." });

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) back("/reset-password", { error: error.message });
  back("/", { message: "Your password has been updated." });
}

export async function logOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
