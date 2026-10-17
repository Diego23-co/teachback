import { useEffect, useId, useRef, type ReactNode } from "react";
import { Icon, type IconName } from "./Icon";
import { useStore } from "../lib/store";
import type { Status } from "../lib/data";

type ButtonProps = {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "peach" | "danger";
  icon?: IconName;
  iconRight?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
};

export function Button({ children, variant = "primary", icon, iconRight, onClick, disabled = false, type = "button", className = "" }: ButtonProps) {
  return (
    <button type={type} className={`btn btn-${variant} ${className}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} />}
      {children}
      {iconRight && <span className="btn-icon-right"><Icon name={iconRight} size={18} /></span>}
    </button>
  );
}

export function IconButton({ icon, label, onClick, className = "" }: { icon: IconName; label: string; onClick?: () => void; className?: string }) {
  return (
    <button type="button" className={`icon-button ${className}`} onClick={onClick} aria-label={label} title={label}>
      <Icon name={icon} />
    </button>
  );
}

export function Segment<T extends string>({ options, value, onChange, label, small = false }: { options: readonly T[]; value: T; onChange: (v: T) => void; label: string; small?: boolean }) {
  return (
    <div className={`segment ${small ? "small" : ""}`} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={value === o} className={value === o ? "selected" : ""} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`toggle ${checked ? "on" : ""}`} />;
}

export function SettingRow({ label, note, checked, onChange }: { label: string; note: string; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="setting-row">
      <span id={id}><strong>{label}</strong><small>{note}</small></span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

export function PrivateBadge({ children = "Private" }: { children?: ReactNode }) {
  return <span className="private"><Icon name="lock" size={14} />{children}</span>;
}

const statusWord: Record<Status, string> = { mint: "clear", amber: "unsure", coral: "mixed up", grey: "not taught" };

export function MiniBar({ colors }: { colors: Status[] }) {
  const clear = colors.filter((c) => c === "mint").length;
  return (
    <div className="mini-bar" role="img" aria-label={`${clear} of ${colors.length} ideas clear`}>
      {colors.map((c, i) => <span className={c} key={i} title={statusWord[c]} />)}
    </div>
  );
}

export function TopicCard({ title, desc, icon, pill, progress = [], status, locked = false, onClick }: { title: string; desc: string; icon: IconName; pill: string; progress?: Status[]; status: string; locked?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={`topic-card ${locked ? "locked" : ""}`} onClick={onClick} disabled={locked} aria-label={`${title}. ${desc}. ${status}`}>
      <span className="topic-card-top">
        <span className="topic-icon"><Icon name={icon} size={22} /></span>
        <span className={`pill pill-${pill.replace(" ", "-").toLowerCase()}`}>{pill}</span>
      </span>
      <h3>{title}</h3>
      <p>{desc}</p>
      {progress.length > 0 && <MiniBar colors={progress} />}
      <span className="topic-foot">
        <span className="topic-status">{status}</span>
        {!locked && <span className="circle-arrow"><Icon name="arrowRight" size={16} /></span>}
      </span>
    </button>
  );
}

/** Accessible modal: traps focus, closes on Escape / backdrop click, restores focus. */
export function Dialog({ open, onClose, label, children, variant = "center", className = "" }: { open: boolean; onClose: () => void; label: string; children: ReactNode; variant?: "center" | "drawer" | "sheet"; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const panel = ref.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input, textarea, select, [tabindex]:not([tabindex="-1"])') ?? []);
    (focusables()[0] ?? panel)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); }
      if (e.key !== "Tab") return;
      const els = focusables();
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className={`backdrop backdrop-${variant}`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} className={`panel panel-${variant} ${className}`}>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Close"><Icon name="x" size={18} /></button>
        {children}
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismissToast } = useStore();
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="toast" key={t.id}>
          <Icon name="check" size={18} />
          <span>{t.message}</span>
          {t.action && <button type="button" onClick={() => { t.action!.run(); dismissToast(t.id); }}>{t.action.label}</button>}
          <button type="button" className="toast-x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}><Icon name="x" size={16} /></button>
        </div>
      ))}
    </div>
  );
}
