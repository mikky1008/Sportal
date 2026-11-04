import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { IonContent, IonFooter, IonPage } from "@ionic/react";
import { Bell, ChevronDown, LogOut, Search, Settings } from "lucide-react";
import { notifications } from "@/data/mock";
import { useAthleteProfile } from "@/lib/profileStore";
import { Link } from "@/router-compat";
import { BottomNav, nav } from "@/layouts/Nav";
import { useAuth } from "@/auth/AuthContext";
import { useIsDesktop } from "@/lib/useIsDesktop";
import { cn } from "@/lib/utils";
import juan from "@/assets/juan.jpg";

interface PageProps {
  title?: string;
  children: ReactNode;
  /** false for sign in / sign up / profile setup: full-screen, no top bar or tab bar */
  shell?: boolean;
  /** show a back arrow (to this path when there is no history) */
  backTo?: string;
  /** hide the bottom tab bar on this screen (e.g. while recording a practice) */
  hideTabs?: boolean;
}

/** The few links that stay visible in the top bar. Everything else lives in the Menu dropdown. */
const TOP_TABS = ["/dashboard", "/performance", "/rankings"];
const MENU_ITEMS = ["/profile", "/scholarships", "/recruiting", "/settings"];

/** Every screen is one of these: an Ionic page with a top navigation bar, scrolling content and (on phones) a tab bar. */
export function Page({ children, shell = true, backTo, hideTabs }: PageProps) {
  const desktop = useIsDesktop();
  if (!shell) {
    return (
      <IonPage>
        <IonContent fullscreen>{children}</IonContent>
      </IonPage>
    );
  }
  return (
    <IonPage>
      <IonContent fullscreen>
        <TopBar backTo={backTo} />
        <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </IonContent>
      {!desktop && !hideTabs && (
        <IonFooter>
          <BottomNav />
        </IonFooter>
      )}
    </IonPage>
  );
}

/** Top navigation: logo, main tabs (tablet and up), search, notifications, and your profile with a settings dropdown. */
function TopBar({ backTo }: { backTo?: string }) {
  const athlete = useAthleteProfile();
  const { pathname } = useLocation();
  const unread = notifications.filter((n) => !n.read).length;
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const tabs = nav.filter((n) => TOP_TABS.includes(n.to));

  return (
    <header
      className="sticky top-0 z-30 border-b border-white/10 pt-[var(--ion-safe-area-top,0px)] text-white"
      style={{ background: "linear-gradient(90deg, #0a1f44 0%, #0f3160 55%, #0a1d3f 100%)" }}
    >
      <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-3 px-4 sm:px-6 md:h-16 md:gap-4 lg:px-8">
        {backTo && (
          <Link to={backTo} direction="back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-sm" aria-label="Back">
            ←
          </Link>
        )}
        <Link to="/dashboard" direction="root" className="flex shrink-0 items-center gap-2.5" aria-label="Sportal home">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-[#1c4274] font-display text-xl font-bold text-white">S</span>
          <span className="font-display text-2xl font-bold tracking-wide text-white">SPORTAL</span>
        </Link>

        <nav aria-label="Main" className="ml-2 hidden items-center md:flex">
          {tabs.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              direction="root"
              aria-current={isActive(to) ? "page" : undefined}
              className={cn(
                "relative flex h-16 items-center gap-2 px-4 text-[15px] transition-colors",
                isActive(to) ? "text-white" : "text-[#9db3d3] hover:text-white",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
              {isActive(to) && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-white/80" />}
            </Link>
          ))}
        </nav>

        <div className="relative ml-2 hidden max-w-xl flex-1 lg:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#c5d3ea]" />
          <input
            type="text"
            placeholder="Search athletes, teams, or training sessions..."
            className="h-11 w-full rounded-full border border-white/15 bg-[#0a1b3a]/70 pl-12 pr-12 text-sm text-white outline-none placeholder:text-[#9db3d3] focus:border-sky-400 focus:ring-4 focus:ring-sky-400/20"
          />
          <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#c5d3ea]" />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <Link to="/notifications" direction="root" aria-label={`Notifications, ${unread} unread`} className="relative grid h-11 w-11 place-items-center rounded-full bg-white/5 text-[#c5d3ea] transition hover:bg-white/10 hover:text-white">
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-red-600 px-1 text-[11px] font-semibold leading-none text-white">{unread}</span>
            )}
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 py-1 pl-1 pr-2">
            <Link to="/profile" direction="root" className="flex items-center gap-2" aria-label="My profile">
              <span className="relative">
                <img src={juan} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-emerald-400" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#0f2f5e] bg-emerald-400" />
              </span>
              <span className="hidden text-sm font-medium text-white sm:inline">{athlete.firstName}</span>
            </Link>
            <span className="hidden h-5 w-px bg-white/20 sm:block" aria-hidden="true" />
            <MenuDropdown />
          </div>
        </div>
      </div>
    </header>
  );
}

/** Gear + chevron button that drops down the less important pages and Sign out. */
function MenuDropdown() {
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const items = nav.filter((n) => MENU_ITEMS.includes(n.to));

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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Menu"
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-1 rounded-full px-1.5 py-1.5 text-[#c5d3ea] transition hover:text-white"
      >
        <Settings className="h-5 w-5" />
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-3 w-60 rounded-2xl border bg-white p-2 text-foreground shadow-lg">
          {items.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              direction="root"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive(to) ? "bg-primary/10 font-medium text-primary" : "text-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-muted"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
