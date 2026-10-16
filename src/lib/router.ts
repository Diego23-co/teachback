import { useEffect, useSyncExternalStore } from "react";

export type Page =
  | "splash"
  | "onboarding"
  | "profile"
  | "home"
  | "topics"
  | "topic"
  | "confidence"
  | "meet"
  | "session"
  | "after"
  | "summary"
  | "progress"
  | "history"
  | "privacy"
  | "settings";

const pages = new Set<Page>([
  "splash", "onboarding", "profile", "home", "topics", "topic", "confidence",
  "meet", "session", "after", "summary", "progress", "history", "privacy", "settings",
]);

export const pageTitles: Record<Page, string> = {
  splash: "Welcome",
  onboarding: "How it works",
  profile: "Your profile",
  home: "Home",
  topics: "Topics",
  topic: "Recursion",
  confidence: "Before you start",
  meet: "Meet Kai",
  session: "Teaching Kai",
  after: "Reflect",
  summary: "Session reflection",
  progress: "My Progress",
  history: "Session History",
  privacy: "Privacy & Data",
  settings: "Settings",
};

function read(): Page {
  const hash = window.location.hash.replace(/^#\/?/, "") as Page;
  return pages.has(hash) ? hash : "splash";
}

function subscribe(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

/** Hash routing: real browser back/forward + shareable deep links, no extra deps. */
export function usePage(): Page {
  const page = useSyncExternalStore(subscribe, read, () => "splash" as Page);
  useEffect(() => {
    document.title = `${pageTitles[page]} · TeachBack`;
    window.scrollTo({ top: 0 });
    // Move focus to the page heading so screen readers announce the new view.
    requestAnimationFrame(() => document.querySelector<HTMLElement>("h1")?.focus({ preventScroll: true }));
  }, [page]);
  return page;
}

export function go(page: Page) {
  window.location.hash = `/${page}`;
}

export type Go = typeof go;
