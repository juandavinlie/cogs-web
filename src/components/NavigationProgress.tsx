"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type State = "idle" | "loading" | "done";

/**
 * Thin progress bar at the top of the page while navigating between pages.
 * Starts on same-site link clicks and GET form submits (e.g. filters), and
 * finishes when the URL changes.
 */
export default function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams}`;
  const [state, setState] = useState<State>("idle");
  const [lastUrl, setLastUrl] = useState(url);

  // New page rendered: finish the bar. (Adjusting state during render, per React docs.)
  if (url !== lastUrl) {
    setLastUrl(url);
    if (state === "loading") setState("done");
  }

  useEffect(() => {
    if (state === "idle") return;
    // "done": let the fade-out play. "loading": give up after 15s in case nothing navigates.
    const t = setTimeout(() => setState(state === "done" ? "idle" : "done"), state === "done" ? 400 : 15000);
    return () => clearTimeout(t);
  }, [state]);

  useEffect(() => {
    const isNewPage = (target: URL) =>
      target.origin === location.origin && (target.pathname !== location.pathname || target.search !== location.search);

    const onClick = (e: MouseEvent) => {
      // Not checking e.defaultPrevented: Next's <Link> always prevents default to navigate client-side.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a");
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      if (isNewPage(new URL(a.href, location.href))) setState("loading");
    };

    const onSubmit = (e: SubmitEvent) => {
      // Not checking e.defaultPrevented: next/form prevents default to navigate client-side.
      // Server-action forms (e.g. delete buttons) get a javascript: action from React, which
      // isNewPage() rejects, so only real GET navigations start the bar.
      const form = e.target as HTMLFormElement;
      if (form.method.toLowerCase() !== "get") return;
      const target = new URL(form.action || location.href, location.href);
      target.search = new URLSearchParams(new FormData(form) as unknown as Record<string, string>).toString();
      if (isNewPage(target)) setState("loading");
    };

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  if (state === "idle") return null;
  return <div aria-hidden className={`nav-progress nav-progress--${state}`} />;
}
