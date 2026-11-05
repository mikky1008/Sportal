import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface HeroTile {
  label: string;
  value: string;
  icon: LucideIcon;
}

interface ProfileHeroProps {
  ariaLabel: string;
  avatar: ReactNode;
  name: string;
  /** lines under the name (sport • position, school...) */
  meta?: ReactNode[];
  /** verification or status badge under the lines */
  badge?: ReactNode;
  tiles: HeroTile[];
  /** "stat" = short numbers (3 across on phones); "text" = longer values (stack on phones, truncate) */
  tileSize?: "stat" | "text";
  /** classes for the tile icons, e.g. "text-gold" */
  iconClassName?: string;
  /** decoration behind the content (a photo or a glow); each role keeps its own */
  backdrop?: ReactNode;
  /** strip along the bottom: a note on the left, an action on the right */
  footer?: ReactNode;
}

/**
 * The profile card at the top of both dashboards: avatar, name, details and three highlight tiles.
 * Same structure for athletes and coaches; the content and the colors (from the theme) differ.
 */
export function ProfileHero({ ariaLabel, avatar, name, meta = [], badge, tiles, tileSize = "stat", iconClassName = "text-gold", backdrop, footer }: ProfileHeroProps) {
  return (
    <section aria-label={ariaLabel} className="relative overflow-hidden rounded-3xl bg-hero text-navy-foreground shadow-card">
      {backdrop}
      <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-center gap-4 sm:gap-5">
          {avatar}
          <div className="min-w-0">
            <h2 className="break-words text-2xl font-bold sm:text-3xl">{name}</h2>
            {meta.map((line, i) => (
              <p key={i} className={cn("break-words text-navy-muted", i > 0 && "text-sm")}>{line}</p>
            ))}
            {badge && <div className="mt-2">{badge}</div>}
          </div>
        </div>
        <div className={cn("grid gap-3 lg:ml-auto lg:min-w-[30rem]", tileSize === "stat" ? "grid-cols-3" : "grid-cols-1 sm:grid-cols-3")}>
          {tiles.map(({ label, value, icon: Icon }) => (
            <div key={label} className="min-w-0 rounded-2xl bg-navy-foreground/10 p-3 backdrop-blur sm:p-4">
              <Icon className={cn("h-4 w-4", iconClassName)} />
              <p
                title={value}
                className={cn("mt-1 truncate font-display font-bold", tileSize === "stat" ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl")}
              >
                {value}
              </p>
              <p className="text-[11px] text-navy-muted sm:text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
      {footer && (
        <div className="relative flex flex-col gap-3 border-t border-navy-foreground/10 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">{footer}</div>
      )}
    </section>
  );
}
