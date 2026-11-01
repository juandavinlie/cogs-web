import { cache } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Role = "member" | "admin";

/**
 * The signed-in user and their role, fetched once per request.
 *
 * getClaims() verifies the session token's signature locally (the project uses asymmetric
 * signing keys), so it doesn't call Supabase Auth. The role always comes from the database.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims) return { user: null, role: null, isAdmin: false } as const;

  const user = { id: claims.sub, email: claims.email };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role: Role = profile?.role === "admin" ? "admin" : "member";
  return { user, role, isAdmin: role === "admin" } as const;
});

/** For admin-only pages and actions. Non-admins get a 404 so the page's existence isn't revealed. */
export async function requireAdmin() {
  const current = await getCurrentUser();
  if (!current.isAdmin) notFound();
  return current;
}
