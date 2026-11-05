import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { toast } from "sonner";
import { Bell, ChevronDown, LogOut, Menu, User, X, type LucideIcon } from "lucide-react";
import { Link } from "@/router-compat";
import { useAuth } from "@/auth/AuthContext";
import { useCoachProfile } from "@/lib/coachProfileStore";
import { cn } from "@/lib/utils";

/**
 * Coach shell: a horizontal top navigation bar only (no sidebar). It is separate from the
 * Student-Athlete `Page` shell, and every "home" link here points at /coach/dashboard so a
 * coach is never sent to the athlete dashboard.
 *
 * Only Dashboard is a real screen so far. The other items have no route yet (on purpose),
 * so they show a "coming soon" message instead of navigating to a page that doesn't exist.
 */
export const COACH_HOME = "/coach/dashboard";

interface NavEntry {
  label: string;
  to?: string;
}

const MAIN_NAV: NavEntry[] = [
  { label: "Dashboard", to: COACH_HOME },
  { label: "My Athletes" },
  { label: "Athlete Discovery" },
];

const MORE_NAV: NavEntry[] = [
  { label: "Affiliation Requests" },
  { label: "Recruitment" },
  { label: "Messages" },
  { label: "My University" },
];

const comingSoon = (label: string) => toast(`${label} is coming soon`, { description: "This coach page hasn't been built yet." });

/** Closes a dropdown on outside click, Escape, or route change. */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return { open, setOpen, ref };
}

const menuPanel = "absolute right-0 top-full z-50 mt-2 rounded-2xl border bg-popover p-2 text-popover-foreground shadow-lg";
const menuItem = "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Brand() {
  return (
    <Link to={COACH_HOME} direction="root" className="flex shrink-0 items-center gap-2.5" aria-label="Sportal coach home">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-[#55b8ed] font-display text-xl font-bold text-[#142b4a]">S</span>
      <span className="font-display text-2xl font-bold tracking-wide text-white">SPORTAL</span>
    </Link>
  );
}

function NavLink({ item, active }: { item: NavEntry; active: boolean }) {
  const cls = cn(
    "relative flex h-16 items-center px-4 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#55b8ed]",
    active ? "text-white" : "text-[#a9bcd6] hover:text-white",
  );
  const underline = active && <span className="absolute inset-x-3 bottom-0 h-[3px] rounded-full bg-[#55b8ed]" />;
  if (item.to) {
    return (
      <Link to={item.to} direction="root" aria-current={active ? "page" : undefined} className={cls}>
        {item.label}
        {underline}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={() => comingSoon(item.label)}>
      {item.label}
    </button>
  );
}

function MoreDropdown() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-16 items-center gap-1 px-4 text-[15px] font-medium text-[#a9bcd6] transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#55b8ed]"
      >
        More
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={cn(menuPanel, "left-0 right-auto w-60")}>
          {MORE_NAV.map((item) => (
            <button key={item.label} type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); comingSoon(item.label); }}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function NotificationsButton() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        aria-haspopup="menu"
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white/5 text-[#c5d3ea] transition hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b8ed]"
      >
        <Bell className="h-5 w-5" />
        <span className="absolute right-2.5 top-2.5 h-2.5 w-2.5 rounded-full border-2 border-[#142b4a] bg-[#55b8ed]" />
      </button>
      {open && (
        <div role="menu" className={cn(menuPanel, "w-[min(20rem,calc(100vw-2rem))]")}>
          <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notifications · sample data</p>
          {["New affiliation request from a student-athlete", "A recruiter replied to your inquiry", "An athlete updated their profile"].map((t) => (
            <div key={t} className="rounded-xl px-3 py-2.5 text-sm hover:bg-muted">{t}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProfileDropdown({ name }: { name: string }) {
  const { open, setOpen, ref } = useDropdown();
  const { signOut } = useAuth();
  const initials = name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase() || "C";
  const items: { label: string; icon: LucideIcon }[] = [{ label: "My Profile", icon: User }];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Coach profile menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2.5 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#55b8ed]"
      >
        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#55b8ed] text-sm font-bold text-[#142b4a]">{initials}</span>
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-white sm:inline">{name}</span>
        <ChevronDown className={cn("h-4 w-4 text-[#c5d3ea] transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className={cn(menuPanel, "w-56")}>
          {items.map(({ label, icon: Icon }) => (
            <button key={label} type="button" role="menuitem" className={menuItem} onClick={() => { setOpen(false); comingSoon(label); }}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
          <div className="my-1 h-px bg-border" />
          <button type="button" role="menuitem" className={menuItem} onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function CoachLayout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { profile } = useCoachProfile();
  const [mobileOpen, setMobileOpen] = useState(false);
  const name = `${profile.firstName} ${profile.lastName}`.trim() || "Coach";
  const isActive = (to?: string) => !!to && (pathname === to || pathname.startsWith(to + "/"));

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="coach-theme min-h-full bg-background text-foreground">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-[#142b4a] pt-[var(--ion-safe-area-top,0px)] text-white">
            <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:px-6 lg:px-8">
              <button
                type="button"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label={mobileOpen ? "Close menu" : "Open menu"}
                aria-expanded={mobileOpen}
                className="mr-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/5 md:hidden"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
              <Brand />

              <nav aria-label="Coach" className="ml-4 hidden items-center md:flex">
                {MAIN_NAV.map((item) => (
                  <NavLink key={item.label} item={item} active={isActive(item.to)} />
                ))}
                <MoreDropdown />
              </nav>

              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <NotificationsButton />
                <ProfileDropdown name={name} />
              </div>
            </div>

            {/* phones: the same links, stacked under the bar (not a sidebar) */}
            {mobileOpen && (
              <nav aria-label="Coach mobile" className="border-t border-white/10 bg-[#142b4a] px-4 pb-3 pt-2 md:hidden">
                {[...MAIN_NAV, ...MORE_NAV].map((item) =>
                  item.to ? (
                    <Link key={item.label} to={item.to} direction="root" aria-current={isActive(item.to) ? "page" : undefined}
                      className={cn("block rounded-xl px-3 py-3 text-[15px] font-medium", isActive(item.to) ? "bg-white/10 text-white" : "text-[#c5d3ea]")}>
                      {item.label}
                    </Link>
                  ) : (
                    <button key={item.label} type="button" onClick={() => { setMobileOpen(false); comingSoon(item.label); }}
                      className="block w-full rounded-xl px-3 py-3 text-left text-[15px] font-medium text-[#c5d3ea]">
                      {item.label}
                    </button>
                  ),
                )}
              </nav>
            )}
          </header>

          <main className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </IonContent>
    </IonPage>
  );
}
