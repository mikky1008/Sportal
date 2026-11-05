import { cn } from "@/lib/utils";

const initialsOf = (name: string) =>
  name.split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

const SIZES = {
  header: "h-9 w-9 text-sm",
  sm: "h-10 w-10 text-sm",
  md: "h-16 w-16 text-xl",
  lg: "h-20 w-20 text-3xl sm:h-24 sm:w-24 sm:text-4xl",
} as const;

interface PersonAvatarProps {
  name: string;
  /** photo; initials are shown when there isn't one */
  src?: string;
  size?: keyof typeof SIZES;
  /** "full" = circle, "xl" = rounded square (used on profile cards) */
  shape?: "full" | "xl";
  /** onDark: sits on a navy surface. onLight: sits on a white card. */
  tone?: "onDark" | "onLight";
  className?: string;
}

/** The one avatar: photo or initials, same sizes and shapes everywhere. */
export function PersonAvatar({ name, src, size = "md", shape = "full", tone = "onLight", className }: PersonAvatarProps) {
  const base = cn("shrink-0 object-cover", SIZES[size], shape === "full" ? "rounded-full" : "rounded-2xl");
  if (src) return <img src={src} alt="" className={cn(base, className)} />;
  return (
    <span
      aria-hidden="true"
      className={cn(
        base,
        "grid place-items-center font-display font-bold",
        tone === "onDark" ? "bg-electric text-navy" : "bg-electric-gradient text-primary-foreground",
        className,
      )}
    >
      {initialsOf(name) || "?"}
    </span>
  );
}
