import Link from "next/link";
import { logOut } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth";
import { CHURCH } from "@/lib/church";

export default async function Header() {
  const { user, isAdmin } = await getCurrentUser();

  return (
    <header className="sticky top-0 z-10 border-b border-line bg-paper/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="min-w-0 truncate font-serif text-base font-semibold text-brand sm:text-lg">
          {CHURCH.name}
        </Link>
        {user ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden truncate text-sm text-muted md:inline">{user.email}</span>
            {isAdmin && (
              <Link href="/events" className="whitespace-nowrap text-sm font-medium text-brand hover:underline">
                Admin
              </Link>
            )}
            <form action={logOut}>
              <button className="whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-sm font-medium hover:bg-white sm:px-4">
                Log out
              </button>
            </form>
          </div>
        ) : (
          <Link
            href="/login"
            className="shrink-0 rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-brand-dark"
          >
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
