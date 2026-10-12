import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/redirect";

// Landing point for links in verification and password-reset emails.
// Handles both the token_hash style (recommended email templates; works on any
// device) and the PKCE ?code= style (Supabase's default templates; only works
// in the browser where the user signed up / requested the reset).
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));
  const isReset = type === "recovery" || next === "/reset-password";

  const fail = (path: string, message: string) => {
    const url = new URL(path, origin);
    url.searchParams.set("error", message);
    return NextResponse.redirect(url);
  };

  // Supabase itself rejected the link (e.g. it was already used or has expired).
  const supabaseError = searchParams.get("error_code") ?? searchParams.get("error");
  if (supabaseError) {
    console.warn("auth/confirm: Supabase rejected link:", supabaseError, searchParams.get("error_description"));
    return isReset
      ? fail("/forgot-password", "That reset link has expired or was already used. Please request a new one.")
      : fail("/login", "That link has expired or was already used. If you've already verified your email, just log in.");
  }

  const supabase = await createClient();
  let error: unknown = null;

  if (tokenHash && type) {
    ({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }));
  } else if (code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(code));
  } else {
    error = "missing token_hash/code";
  }

  if (!error) {
    const dest = new URL(next, origin);
    if (next === "/" && !isReset) dest.searchParams.set("message", "Your email is verified. Welcome!");
    return NextResponse.redirect(dest);
  }

  console.error("auth/confirm failed:", error);

  if (code && !isReset) {
    // With ?code= links Supabase has already verified the email before we get here;
    // only the automatic sign-in failed (usually: link opened in a different browser).
    const url = new URL("/login", origin);
    url.searchParams.set("message", "Your email is verified. Please log in to continue.");
    return NextResponse.redirect(url);
  }
  return isReset
    ? fail("/forgot-password", "That reset link is invalid or has expired. Please request a new one.")
    : fail("/login", "That link is invalid or has expired. Please try again.");
}
