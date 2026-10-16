import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type TextSize = "S" | "M" | "L" | "XL";
export type Pace = "Relaxed" | "Normal" | "Curious";
export type InputPref = "Type" | "Speak" | "Both";

export interface Settings {
  textSize: TextSize;
  readableFont: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  darkMode: boolean;
  simpleWords: boolean;
  pace: Pace;
  privateSessions: boolean;
  storeVoice: boolean;
  anonData: boolean;
  showMap: boolean;
  inputMode: "Type" | "Speak";
}

export interface Profile {
  name: string;
  course: string;
  inputPref: InputPref;
  esl: boolean;
}

interface Toast { id: number; message: string; action?: { label: string; run: () => void } }

interface Store {
  profile: Profile;
  setProfile: (p: Partial<Profile>) => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  confidenceBefore: number | null;
  setConfidenceBefore: (n: number | null) => void;
  confidenceAfter: number | null;
  setConfidenceAfter: (n: number | null) => void;
  toasts: Toast[];
  toast: (message: string, action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
}

const defaultSettings: Settings = {
  textSize: "M",
  readableFont: false,
  highContrast: false,
  reduceMotion: false,
  darkMode: false,
  simpleWords: true,
  pace: "Normal",
  privateSessions: true,
  storeVoice: false,
  anonData: false,
  showMap: true,
  inputMode: "Type",
};

const defaultProfile: Profile = { name: "Thandi", course: "COMS1018 – Intro to Algorithms", inputPref: "Both", esl: false };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState(() => load("tb-profile", defaultProfile));
  const [settings, setSettings] = useState(() => load("tb-settings", defaultSettings));
  const [confidenceBefore, setConfidenceBefore] = useState<number | null>(null);
  const [confidenceAfter, setConfidenceAfter] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  useEffect(() => save("tb-profile", profile), [profile]);
  useEffect(() => {
    save("tb-settings", settings);
    const root = document.documentElement;
    root.dataset.textSize = settings.textSize;
    root.dataset.theme = settings.darkMode ? "dark" : "light";
    root.toggleAttribute("data-readable", settings.readableFont);
    root.toggleAttribute("data-contrast", settings.highContrast);
    root.toggleAttribute("data-reduce-motion", settings.reduceMotion);
  }, [settings]);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message: string, action?: Toast["action"]) => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, message, action }]);
    setTimeout(() => dismissToast(id), 5000);
  }, [dismissToast]);

  const value = useMemo<Store>(() => ({
    profile,
    setProfile: (p) => setProfileState((prev) => ({ ...prev, ...p })),
    settings,
    setSetting: (key, v) => setSettings((prev) => ({ ...prev, [key]: v })),
    confidenceBefore, setConfidenceBefore,
    confidenceAfter, setConfidenceAfter,
    toasts, toast, dismissToast,
  }), [profile, settings, confidenceBefore, confidenceAfter, toasts, toast, dismissToast]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || "ME";
