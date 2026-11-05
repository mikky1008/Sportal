import type { ReactNode, SelectHTMLAttributes } from "react";
import { ArrowRight, ChevronDown, TrendingDown, TrendingUp } from "lucide-react";
import { Link } from "@/router-compat";
import { cn } from "@/lib/utils";

export function PageHeader({ title, subtitle, action, className }: { title: string; subtitle?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
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
    <section className={cn("surface min-w-0 p-5 sm:p-6", className)}>
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

/** Performance / summary stat card. Same card whether it sits on the athlete or the coach dashboard. */
export function StatTile({ label, value, hint, icon }: { label: string; value: string; hint?: ReactNode; icon?: ReactNode }) {
  return (
    <div className="surface p-4 sm:p-5">
      <div className="flex items-start justify-between gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="min-w-0">{label}</span>
        {icon && <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      </div>
      <p className="mt-2 font-display text-3xl font-bold leading-none">{value}</p>
      {hint && <div className="mt-2 text-xs">{hint}</div>}
    </div>
  );
}

/** Heading for a block of content that isn't inside a Card (same type size as a Card title). */
export function SectionHeading({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {action}
    </div>
  );
}

/** The "View all →" link in a card or section header. A link when `to` is set, a button otherwise. */
export function SectionLink({ label, to, onClick }: { label: string; to?: string; onClick?: () => void }) {
  const cls = "inline-flex items-center gap-1 rounded text-sm font-semibold text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
  if (to) {
    return <Link to={to} className={cls}>{label} <ArrowRight className="h-4 w-4" /></Link>;
  }
  return <button type="button" onClick={onClick} className={cls}>{label} <ArrowRight className="h-4 w-4" /></button>;
}

/** Nothing-here-yet message used inside cards and lists. */
export function EmptyState({ message }: { message: string }) {
  return <p className="rounded-2xl border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">{message}</p>;
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

const btnBase = "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-60";

/**
 * The app's buttons. Pick a look (primary / secondary / onDark), then optionally add `btn.sm`
 * for compact spots (cards, tables) or `btn.block` for full width: cn(btn.secondary, btn.sm, btn.block).
 */
export const btn = {
  primary: `${btnBase} bg-electric-gradient text-primary-foreground shadow-glow hover:brightness-110`,
  secondary: `${btnBase} border bg-card hover:bg-muted`,
  onDark: `${btnBase} bg-navy-foreground text-navy hover:brightness-95`,
  sm: "px-4 py-2",
  block: "w-full",
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
