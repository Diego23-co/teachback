import type { ReactNode } from "react";
import { Redirect } from "./components/Shell";
import { Toasts } from "./components/ui";
import { publicPages, useRoute, type Page } from "./lib/router";
import { useStore } from "./lib/store";
import { Progress, History, Privacy, SettingsPage } from "./pages/Account";
import { Confidence, Meet } from "./pages/Flow";
import { Home } from "./pages/Home";
import { Session } from "./pages/Session";
import { Replay, Summary } from "./pages/Summary";
import { TopicDetail, Topics } from "./pages/Topics";
import { Onboarding, ProfileSetup, SignIn, Splash } from "./pages/Welcome";

const views: Record<Page, (p: { id?: string }) => ReactNode> = {
  splash: Splash,
  onboarding: Onboarding,
  profile: ProfileSetup,
  signin: SignIn,
  home: Home,
  topics: Topics,
  topic: TopicDetail,
  confidence: ({ id }) => <Confidence id={id} />,
  meet: Meet,
  session: Session,
  after: ({ id }) => <Confidence after id={id} />,
  summary: Summary,
  replay: Replay,
  progress: Progress,
  history: History,
  privacy: Privacy,
  settings: SettingsPage,
};

/** Signed-in-only pages bounce to sign-in; signed-in users skip the welcome screens. */
function guard(page: Page, signedIn: boolean, hasAccounts: boolean): Page | null {
  if (!signedIn && !publicPages.has(page)) return hasAccounts ? "signin" : "splash";
  if (signedIn && (page === "splash" || page === "onboarding" || page === "signin")) return "home";
  if (!signedIn && page === "splash" && hasAccounts) return "signin";
  return null;
}

export default function App() {
  const { page, id } = useRoute();
  const { user, accounts } = useStore();
  const target = guard(page, !!user, accounts.length > 0);
  if (target) return <Redirect to={target} />;
  const View = views[page];
  return (
    <>
      <div className="page-enter" key={`${page}/${id ?? ""}`}><View id={id} /></div>
      <Toasts />
    </>
  );
}
