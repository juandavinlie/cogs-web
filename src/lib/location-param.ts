import { redirect } from "next/navigation";
import { getLocation, type Location } from "@/lib/data";

type SP = Record<string, string | string[] | undefined>;

/**
 * Reads the optional ?location= param. If it names a location that doesn't
 * exist, redirects to the same page with the param removed (other params kept).
 */
export async function resolveLocationParam(pathname: string, sp: SP): Promise<Location | null> {
  const code = typeof sp.location === "string" ? sp.location : undefined;
  if (code === undefined) return null;

  const location = code ? await getLocation(code) : null;
  if (location) return location;

  const rest = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "location") continue;
    for (const value of Array.isArray(v) ? v : v === undefined ? [] : [v]) rest.append(k, value);
  }
  const qs = rest.toString();
  redirect(qs ? `${pathname}?${qs}` : pathname);
}
