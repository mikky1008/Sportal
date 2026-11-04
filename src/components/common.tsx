import type { ReactNode, SelectHTMLAttributes } from "react";
import { ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({ children, className, title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={cn("surface p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-xl font-bold">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatTile({ label, value, hint, icon }: { label: string; value: string; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
        {icon}
      </div>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {hint && <div className="mt-1 text-xs">{hint}</div>}
    </div>
  );
}

export function Delta({ value, suffix = "%" }: { value: number; suffix?: string }) {
  const up = value >= 0;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", up ? "text-success" : "text-destructive")}>
      {up ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
      {up ? "+" : ""}{value}{suffix}
    </span>
  );
}

export function ProgressBar({ value, tone = "primary" }: { value: number; tone?: "primary" | "gold" | "success" }) {
  const bg = { primary: "bg-primary", gold: "bg-gold", success: "bg-success" }[tone];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn("h-full rounded-full transition-all", bg)} style={{ width: `${value}%` }} />
    </div>
  );
}

export function Pill({ children, tone = "default", title }: { children: ReactNode; tone?: "default" | "primary" | "gold" | "success" | "warning"; title?: string }) {
  const t = {
    default: "bg-muted text-muted-foreground",
    primary: "bg-accent text-accent-foreground",
    gold: "bg-gold/20 text-foreground",
    success: "bg-success/15 text-success",
    warning: "bg-warning/20 text-foreground",
  }[tone];
  return <span title={title} className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", t)}>{children}</span>;
}

export const btn = {
  primary: "inline-flex items-center justify-center gap-2 rounded-xl bg-electric-gradient px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
  secondary: "inline-flex items-center justify-center gap-2 rounded-xl border bg-card px-5 py-3 text-sm font-semibold transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  onDark: "inline-flex items-center justify-center gap-2 rounded-xl bg-navy-foreground px-5 py-3 text-sm font-semibold text-navy transition hover:brightness-95",
};

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** Shown (muted, not selectable) while the value is "". Leave out when the list has a real default. */
  placeholder?: string;
  size?: "md" | "sm";
  /** Classes for the wrapper, e.g. width or flex sizing. `className` styles the <select> itself. */
  wrapperClassName?: string;
};

/**
 * The app's one dropdown. A drop-in replacement for <select>: same props, same events, same
 * values. Styling lives in the `.select-field` / `.select-arrow` classes in styles.css.
 */
export function Select({ placeholder, size = "md", className, wrapperClassName, children, ...rest }: SelectProps) {
  const empty = placeholder !== undefined && rest.value === "";
  return (
    <div className={cn("select-wrap", wrapperClassName)}>
      <select {...rest} data-size={size} data-empty={empty || undefined} className={cn("select-field", className)}>
        {placeholder !== undefined && <option value="" disabled>{placeholder}</option>}
        {children}
      </select>
      <ChevronDown className="select-arrow" aria-hidden="true" />
    </div>
  );
}
