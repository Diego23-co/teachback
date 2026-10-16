import type { ReactNode } from "react";
import { Toasts } from "./components/ui";
import { usePage, type Page } from "./lib/router";
import { Progress, History, Privacy, SettingsPage } from "./pages/Account";
import { Confidence, Meet } from "./pages/Flow";
import { Home } from "./pages/Home";
import { Session } from "./pages/Session";
import { Summary } from "./pages/Summary";
import { TopicDetail, Topics } from "./pages/Topics";
import { Onboarding, ProfileSetup, Splash } from "./pages/Welcome";

const views: Record<Page, () => ReactNode> = {
  splash: Splash,
  onboarding: Onboarding,
  profile: ProfileSetup,
  home: Home,
  topics: Topics,
  topic: TopicDetail,
  confidence: () => <Confidence />,
  meet: Meet,
  session: Session,
  after: () => <Confidence after />,
  summary: Summary,
  progress: Progress,
  history: History,
  privacy: Privacy,
  settings: SettingsPage,
};

export default function App() {
  const page = usePage();
  const View = views[page];
  return (
    <>
      <div className="page-enter" key={page}><View /></div>
      <Toasts />
    </>
  );
}
