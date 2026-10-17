import { useEffect, useSyncExternalStore } from "react";

export type Page =
  | "splash"
  | "onboarding"
  | "profile"
  | "signin"
  | "home"
  | "topics"
  | "topic"
  | "confidence"
  | "meet"
  | "session"
  | "after"
  | "summary"
  | "replay"
  | "progress"
  | "history"
  | "privacy"
  | "settings";

export const pageTitles: Record<Page, string> = {
  splash: "Welcome",
  onboarding: "How it works",
  profile: "Your profile",
  signin: "Sign in",
  home: "Home",
  topics: "Topics",
  topic: "Topic",
  confidence: "Before you start",
  meet: "Meet Kai",
  session: "Teaching Kai",
  after: "Reflect",
  summary: "Session reflection",
  replay: "Replay session",
  progress: "My Progress",
  history: "Session History",
  privacy: "Privacy & Data",
  settings: "Settings",
};

/** Pages you can see without signing in. */
export const publicPages = new Set<Page>(["splash", "onboarding", "profile", "signin"]);

export interface Route { page: Page; id?: string }

let cached: { hash: string; route: Route } | null = null;

function read(): Route {
  const hash = window.location.hash;
  if (cached?.hash === hash) return cached.route;
  const [page, id] = hash.replace(/^#\/?/, "").split("/").map(decodeURIComponent);
  const route: Route = page in pageTitles ? { page: page as Page, id: id || undefined } : { page: "splash" };
  cached = { hash, route };
  return route;
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Hash routing: real browser back/forward + deep links (e.g. #/summary/<id>), no extra deps. */
export function useRoute(): Route {
  const route = useSyncExternalStore(subscribe, read, () => ({ page: "splash" }) as Route);
  useEffect(() => {
    document.title = `${pageTitles[route.page]} · TeachBack`;
    window.scrollTo({ top: 0 });
    // Move focus to the page heading so screen readers announce the new view,
    // but never steal focus from something the user has already focused.
    const t = window.setTimeout(() => {
      const active = document.activeElement;
      if (!active || active === document.body) document.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [route.page, route.id]);
  return route;
}

export function go(page: Page, id?: string) {
  window.location.hash = id ? `/${page}/${encodeURIComponent(id)}` : `/${page}`;
}

/** Navigate without leaving a history entry (used for redirects). */
export function redirect(page: Page, id?: string) {
  const url = `${window.location.pathname}${window.location.search}#/${page}${id ? `/${encodeURIComponent(id)}` : ""}`;
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}
