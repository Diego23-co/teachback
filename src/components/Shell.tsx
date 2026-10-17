import { useEffect, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { Kai } from "./Kai";
import { Button } from "./ui";
import { go, redirect, type Page } from "../lib/router";
import { initials, useStore } from "../lib/store";

const navItems: { page: Page; icon: IconName; label: string; short: string; mobile: boolean }[] = [
  { page: "home", icon: "home", label: "Home", short: "Home", mobile: true },
  { page: "topics", icon: "book", label: "Topics", short: "Topics", mobile: true },
  { page: "progress", icon: "chart", label: "My Progress", short: "Progress", mobile: true },
  { page: "history", icon: "clock", label: "Session History", short: "History", mobile: true },
  { page: "privacy", icon: "lock", label: "Privacy & Data", short: "Privacy", mobile: false },
  { page: "settings", icon: "gear", label: "Settings", short: "Settings", mobile: true },
];

export function Shell({ page, children }: { page: Page; children: ReactNode }) {
  const { profile } = useStore();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Skip to content</a>
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => go("home")} aria-label="TeachBack home">
          <Kai size="sm" /> <strong>TeachBack</strong>
        </button>
        <nav aria-label="Main">
          {navItems.map((item) => (
            <button key={item.page} type="button" className={`nav-item ${page === item.page ? "active" : ""} ${item.mobile ? "" : "desktop-only"}`} aria-current={page === item.page ? "page" : undefined} onClick={() => go(item.page)} title={item.label}>
              <Icon name={item.icon} />
              <span className="nav-label">{item.label}</span>
              <span className="nav-short">{item.short}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <Button icon="plus" onClick={() => go("topics")} className="teach-btn"><span className="nav-label">Teach Kai</span></Button>
          <button type="button" className="profile-mini" onClick={() => go("profile")} aria-label="Edit profile">
            <span className="user-avatar">{initials(profile.name)}</span>
            <span className="profile-text"><strong>{profile.name}</strong><small>{profile.course.split(" – ")[0]}</small></span>
          </button>
        </div>
      </aside>
      <main id="main" className="main">{children}</main>
    </div>
  );
}

export function PageHeader({ eyebrow, title, sub, aside }: { eyebrow: string; title: ReactNode; sub: string; aside?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 tabIndex={-1}>{title}</h1>
        <p>{sub}</p>
      </div>
      {aside}
    </header>
  );
}

export function BackLink({ to, id, children }: { to: Page; id?: string; children: ReactNode }) {
  return <button type="button" className="back-link" onClick={() => go(to, id)}><Icon name="arrow" size={18} /> {children}</button>;
}

/** Redirect after render (never during it). */
export function Redirect({ to, id }: { to: Page; id?: string }) {
  useEffect(() => redirect(to, id), [to, id]);
  return null;
}
