/**
 * Database-free persistence. Everything lives in this browser's localStorage:
 *  - tb-accounts        list of profiles on this device (name, course, salted PIN hash)
 *  - tb-data-<id>       one profile's profile/settings/sessions
 *  - tb-auth            who is signed in (localStorage = "keep me signed in", else sessionStorage)
 * To move between devices, students download a backup file encrypted with their PIN
 * and restore it on the other device.
 */

export interface Account {
  id: string;
  name: string;
  course: string;
  salt: string;
  pinHash: string;
  createdAt: number;
}

export interface BackupFile {
  app: "teachback";
  version: 1;
  exportedAt: string;
  account: Account;
  encrypted: boolean;
  iv?: string;
  /** Separate salt for the encryption key, so it can't be derived from the stored PIN hash. */
  keySalt?: string;
  data: string;
}

const ACCOUNTS = "tb-accounts";
const AUTH = "tb-auth";
const dataKey = (id: string) => `tb-data-${id}`;

const subtle = typeof crypto !== "undefined" && crypto.subtle && window.isSecureContext ? crypto.subtle : null;
const enc = new TextEncoder();
const dec = new TextDecoder();

const toB64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomBytes(n: number) {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

async function pbkdf2(pin: string, salt: Uint8Array, usage: "bits" | "key") {
  const base = await subtle!.importKey("raw", enc.encode(pin), "PBKDF2", false, usage === "bits" ? ["deriveBits"] : ["deriveKey"]);
  const params = { name: "PBKDF2", salt: salt as BufferSource, iterations: 150_000, hash: "SHA-256" };
  if (usage === "bits") return subtle!.deriveBits(params, base, 256);
  return subtle!.deriveKey(params, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

/** Fallback for non-secure contexts (plain http on a LAN), where WebCrypto is unavailable. */
function weakHash(pin: string, salt: string) {
  let h = 2166136261;
  const s = `${salt}:${pin}`;
  for (let round = 0; round < 5000; round++) for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i) ^ round, 16777619);
  return `weak:${(h >>> 0).toString(16)}`;
}

export async function hashPin(pin: string, salt: string) {
  if (!subtle) return weakHash(pin, salt);
  return toB64(await pbkdf2(pin, fromB64(salt), "bits") as ArrayBuffer);
}

export async function createAccount(name: string, course: string, pin: string): Promise<Account> {
  const salt = toB64(randomBytes(16));
  return { id: newId(), name, course, salt, pinHash: await hashPin(pin, salt), createdAt: Date.now() };
}

export async function verifyPin(account: Account, pin: string) {
  return (await hashPin(pin, account.salt)) === account.pinHash;
}

export function loadAccounts(): Account[] {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS) ?? "[]"); } catch { return []; }
}

export function saveAccounts(accounts: Account[]) {
  localStorage.setItem(ACCOUNTS, JSON.stringify(accounts));
}

export function loadData<T>(id: string): T | null {
  try {
    const raw = localStorage.getItem(dataKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/** Returns false when the browser's storage is full or blocked. */
export function saveData(id: string, data: unknown) {
  try { localStorage.setItem(dataKey(id), JSON.stringify(data)); return true; } catch { return false; }
}

export function removeData(id: string) {
  try { localStorage.removeItem(dataKey(id)); } catch { /* ignore */ }
}

export function storageUsed(id: string) {
  try { return (localStorage.getItem(dataKey(id)) ?? "").length * 2; } catch { return 0; }
}

export function readAuth(): { id: string; stay: boolean } | null {
  try {
    const local = localStorage.getItem(AUTH);
    if (local) return { id: local, stay: true };
    const session = sessionStorage.getItem(AUTH);
    return session ? { id: session, stay: false } : null;
  } catch { return null; }
}

export function writeAuth(id: string | null, stay = true) {
  try {
    localStorage.removeItem(AUTH);
    sessionStorage.removeItem(AUTH);
    if (id) (stay ? localStorage : sessionStorage).setItem(AUTH, id);
  } catch { /* ignore */ }
}

export async function makeBackup(account: Account, data: unknown, pin: string): Promise<BackupFile> {
  const json = JSON.stringify(data);
  const base = { app: "teachback" as const, version: 1 as const, exportedAt: new Date().toISOString(), account };
  if (!subtle) return { ...base, encrypted: false, data: json };
  const iv = randomBytes(12);
  const keySalt = randomBytes(16);
  const key = await pbkdf2(pin, keySalt, "key") as CryptoKey;
  const cipher = await subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, key, enc.encode(json));
  return { ...base, encrypted: true, iv: toB64(iv), keySalt: toB64(keySalt), data: toB64(cipher) };
}

export function parseBackup(text: string): BackupFile | null {
  try {
    const b = JSON.parse(text);
    if (b?.app !== "teachback" || !b.account?.id || !b.account?.pinHash || typeof b.data !== "string") return null;
    return b as BackupFile;
  } catch { return null; }
}

/** Verifies the PIN against the backup and returns its decrypted data, or null if the PIN is wrong. */
export async function openBackup<T>(backup: BackupFile, pin: string): Promise<T | null> {
  if (!(await verifyPin(backup.account, pin))) return null;
  if (!backup.encrypted) return JSON.parse(backup.data);
  if (!subtle) throw new Error("This backup is encrypted. Open TeachBack over https or localhost to restore it.");
  const key = await pbkdf2(pin, fromB64(backup.keySalt!), "key") as CryptoKey;
  const plain = await subtle.decrypt({ name: "AES-GCM", iv: fromB64(backup.iv!) as BufferSource }, key, fromB64(backup.data) as BufferSource);
  return JSON.parse(dec.decode(plain));
}

export function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "application/json" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
