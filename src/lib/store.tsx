import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { emptyNodes, type Session } from "./engine";
import { getTopic } from "./topics";
import {
  createAccount, downloadFile, loadAccounts, loadData, makeBackup, newId, openBackup, readAuth, removeData,
  saveAccounts, saveData, verifyPin, writeAuth, type Account, type BackupFile,
} from "./vault";

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
  keepTranscripts: boolean;
  showMap: boolean;
  inputMode: "Type" | "Speak";
  demoHelpers: boolean;
}

export interface Profile {
  name: string;
  course: string;
  inputPref: InputPref;
  esl: boolean;
}

export interface UserData { profile: Profile; settings: Settings; sessions: Session[] }

interface Toast { id: number; message: string; action?: { label: string; run: () => void } }

type Result = { ok: true } | { ok: false; error: string };

interface Store {
  user: Account | null;
  accounts: Account[];
  staySignedIn: boolean;
  setStaySignedIn: (v: boolean) => void;
  signUp: (profile: Profile, pin: string, stay: boolean) => Promise<void>;
  signIn: (accountId: string, pin: string, stay: boolean) => Promise<Result>;
  signOut: () => void;
  removeAccount: (accountId: string) => void;
  changePin: (oldPin: string, newPin: string) => Promise<Result>;
  exportBackup: (pin: string) => Promise<Result>;
  restoreBackup: (backup: BackupFile, pin: string, stay: boolean) => Promise<Result>;

  profile: Profile;
  setProfile: (p: Partial<Profile>) => void;
  settings: Settings;
  setSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  sessions: Session[];
  startSession: (topicId: string, confidenceBefore: number | null) => string;
  updateSession: (id: string, fn: (s: Session) => Session) => void;
  deleteSession: (id: string) => void;
  restoreSession: (s: Session) => void;
  deleteAllSessions: () => void;
  pendingConfidence: number | null;
  setPendingConfidence: (n: number | null) => void;

  toasts: Toast[];
  toast: (message: string, action?: Toast["action"]) => void;
  dismissToast: (id: number) => void;
}

export const defaultSettings: Settings = {
  textSize: "M",
  readableFont: false,
  highContrast: false,
  reduceMotion: false,
  darkMode: false,
  simpleWords: false,
  pace: "Normal",
  keepTranscripts: true,
  showMap: true,
  inputMode: "Type",
  demoHelpers: false,
};

const blankProfile: Profile = { name: "", course: "COMS1018 – Intro to Algorithms", inputPref: "Both", esl: false };

function hydrate(raw: Partial<UserData> | null, account: Account): UserData {
  return {
    profile: { ...blankProfile, name: account.name, course: account.course, ...raw?.profile },
    settings: { ...defaultSettings, ...raw?.settings },
    sessions: Array.isArray(raw?.sessions) ? raw!.sessions : [],
  };
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<Account[]>(loadAccounts);
  const [auth, setAuth] = useState(() => {
    const a = readAuth();
    return a && loadAccounts().some((x) => x.id === a.id) ? a : null;
  });
  const user = accounts.find((a) => a.id === auth?.id) ?? null;
  const [data, setData] = useState<UserData | null>(() => (user ? hydrate(loadData(user.id), user) : null));
  const [pendingConfidence, setPendingConfidence] = useState<number | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);
  const warnedFull = useRef(false);

  const dismissToast = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback((message: string, action?: Toast["action"]) => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, message, action }]);
    setTimeout(() => dismissToast(id), action ? 7000 : 5000);
  }, [dismissToast]);

  const persistAccounts = useCallback((next: Account[]) => {
    setAccounts(next);
    try { saveAccounts(next); } catch { /* storage blocked */ }
  }, []);

  // Save the signed-in user's data on every change.
  useEffect(() => {
    if (!user || !data) return;
    if (!saveData(user.id, data) && !warnedFull.current) {
      warnedFull.current = true;
      toast("This browser’s storage is full. Download a backup, then delete old sessions.");
    }
  }, [user, data, toast]);

  // Other tabs: pick up sign-outs and changes made elsewhere.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === "tb-accounts") setAccounts(loadAccounts());
      if (e.key === "tb-auth") {
        const a = readAuth();
        setAuth(a);
        const acc = loadAccounts().find((x) => x.id === a?.id);
        setData(acc ? hydrate(loadData(acc.id), acc) : null);
      }
      if (user && e.key === `tb-data-${user.id}` && e.newValue) setData(hydrate(JSON.parse(e.newValue), user));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user]);

  const settings = data?.settings ?? defaultSettings;
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.textSize = settings.textSize;
    root.dataset.theme = settings.darkMode ? "dark" : "light";
    root.toggleAttribute("data-readable", settings.readableFont);
    root.toggleAttribute("data-contrast", settings.highContrast);
    root.toggleAttribute("data-reduce-motion", settings.reduceMotion);
  }, [settings]);

  const enter = useCallback((account: Account, stay: boolean, raw?: Partial<UserData> | null) => {
    writeAuth(account.id, stay);
    setAuth({ id: account.id, stay });
    setData(hydrate(raw ?? loadData(account.id), account));
  }, []);

  const updateData = useCallback((fn: (d: UserData) => UserData) => setData((d) => (d ? fn(d) : d)), []);

  const value = useMemo<Store>(() => {
    const profile = data?.profile ?? blankProfile;
    return {
      user,
      accounts,
      staySignedIn: auth?.stay ?? true,
      setStaySignedIn: (stay) => { if (user) { writeAuth(user.id, stay); setAuth({ id: user.id, stay }); } },

      signUp: async (p, pin, stay) => {
        const account = await createAccount(p.name, p.course, pin);
        persistAccounts([...loadAccounts(), account]);
        const settings = { ...defaultSettings, simpleWords: p.esl, inputMode: p.inputPref === "Speak" ? "Speak" as const : "Type" as const };
        enter(account, stay, { profile: p, settings, sessions: [] });
      },
      signIn: async (accountId, pin, stay) => {
        const account = accounts.find((a) => a.id === accountId);
        if (!account) return { ok: false, error: "That profile isn’t on this device any more." };
        if (!(await verifyPin(account, pin))) return { ok: false, error: "That PIN doesn’t match. Try again." };
        enter(account, stay);
        return { ok: true };
      },
      signOut: () => { writeAuth(null); setAuth(null); setData(null); setPendingConfidence(null); },
      removeAccount: (accountId) => {
        removeData(accountId);
        persistAccounts(accounts.filter((a) => a.id !== accountId));
        if (accountId === user?.id) { writeAuth(null); setAuth(null); setData(null); }
      },
      changePin: async (oldPin, newPin) => {
        if (!user) return { ok: false, error: "Not signed in." };
        if (!(await verifyPin(user, oldPin))) return { ok: false, error: "Your current PIN is incorrect." };
        const fresh = await createAccount(user.name, user.course, newPin);
        persistAccounts(accounts.map((a) => (a.id === user.id ? { ...a, salt: fresh.salt, pinHash: fresh.pinHash } : a)));
        return { ok: true };
      },
      exportBackup: async (pin) => {
        if (!user || !data) return { ok: false, error: "Not signed in." };
        if (!(await verifyPin(user, pin))) return { ok: false, error: "That PIN doesn’t match." };
        const backup = await makeBackup(user, data, pin);
        const safe = (data.profile.name || "student").replace(/[^a-z0-9]+/gi, "-").toLowerCase();
        downloadFile(`teachback-${safe}-${new Date().toLocaleDateString("en-CA")}.json`, JSON.stringify(backup, null, 2));
        return { ok: true };
      },
      restoreBackup: async (backup, pin, stay) => {
        let restored: Partial<UserData> | null;
        try { restored = await openBackup<UserData>(backup, pin); }
        catch (e) { return { ok: false, error: (e as Error).message }; }
        if (!restored) return { ok: false, error: "That PIN doesn’t match this backup." };
        const others = loadAccounts().filter((a) => a.id !== backup.account.id);
        persistAccounts([...others, backup.account]);
        saveData(backup.account.id, restored);
        enter(backup.account, stay, restored);
        return { ok: true };
      },

      profile,
      setProfile: (p) => {
        updateData((d) => ({ ...d, profile: { ...d.profile, ...p } }));
        if (user && (p.name !== undefined || p.course !== undefined)) {
          persistAccounts(accounts.map((a) => (a.id === user.id ? { ...a, name: p.name ?? a.name, course: p.course ?? a.course } : a)));
        }
      },
      settings,
      setSetting: (key, v) => updateData((d) => ({ ...d, settings: { ...d.settings, [key]: v } })),

      sessions: data?.sessions ?? [],
      startSession: (topicId, confidenceBefore) => {
        const topic = getTopic(topicId)!;
        const now = Date.now();
        const session: Session = {
          id: newId(), topicId, status: "active", createdAt: now, updatedAt: now,
          messages: [{ from: "kai", text: topic.intro.replace("Hey!", profile.name ? `Hey ${profile.name}!` : "Hey!"), at: now, mood: "curious", snapshot: {} }],
          nodes: emptyNodes(topic), lastChanged: [], confidenceBefore, confidenceAfter: null,
          tryAttempts: 0, trySuccess: false, nextChecked: [], challenges: [],
        };
        updateData((d) => ({ ...d, sessions: [session, ...d.sessions] }));
        return session.id;
      },
      updateSession: (id, fn) => updateData((d) => ({ ...d, sessions: d.sessions.map((s) => (s.id === id ? { ...fn(s), updatedAt: Date.now() } : s)) })),
      deleteSession: (id) => updateData((d) => ({ ...d, sessions: d.sessions.filter((s) => s.id !== id) })),
      restoreSession: (s) => updateData((d) => ({ ...d, sessions: [...d.sessions, s].sort((a, b) => b.createdAt - a.createdAt) })),
      deleteAllSessions: () => updateData((d) => ({ ...d, sessions: [] })),
      pendingConfidence, setPendingConfidence,

      toasts, toast, dismissToast,
    };
  }, [user, accounts, auth, data, settings, pendingConfidence, toasts, toast, dismissToast, enter, updateData, persistAccounts]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used inside StoreProvider");
  return ctx;
}

export const initials = (name: string) => name.trim().slice(0, 2).toUpperCase() || "ME";
