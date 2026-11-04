import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import {
  IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar,
} from "@ionic/react";
import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { notifications } from "@/data/mock";
import { useAthleteProfile } from "@/lib/profileStore";
import { Link } from "@/router-compat";
import { BottomNav, nav } from "@/layouts/Nav";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { useIsDesktop } from "@/lib/useIsDesktop";
import juan from "@/assets/juan.jpg";

interface PageProps {
  title?: string;
  children: ReactNode;
  /** false for sign in / sign up / profile setup: full-screen, no toolbar or tab bar */
  shell?: boolean;
  /** show a back arrow (to this path when there is no history) instead of the menu button */
  backTo?: string;
  /** hide the bottom tab bar on this screen (e.g. while recording a practice) */
  hideTabs?: boolean;
}

/** Every screen is one of these: an Ionic page with a native toolbar, scrolling content and tab bar. */
export function Page({ title, children, shell = true, backTo, hideTabs }: PageProps) {
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
      {!desktop && (
        <IonHeader className="ion-no-border">
          <IonToolbar>
            <IonButtons slot="start">
              {backTo ? <IonBackButton defaultHref={backTo} /> : <IonMenuButton />}
            </IonButtons>
            <IonTitle className="font-display font-bold tracking-wide">{title ?? "SPORTAL"}</IonTitle>
            <IonButtons slot="end">
              <HeaderActions />
            </IonButtons>
          </IonToolbar>
        </IonHeader>
      )}
      <IonContent fullscreen>
        {desktop && <DesktopTopBar backTo={backTo} />}
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

/** The few links that stay visible in the top bar. Everything else lives in the Menu dropdown. */
const TOP_TABS = ["/dashboard", "/performance", "/rankings"];
const MENU_ITEMS = ["/profile", "/scholarships", "/recruiting", "/settings"];

/** Tablet / desktop navigation: logo, main tabs, notifications, you, and a Menu dropdown. */
function DesktopTopBar({ backTo }: { backTo?: string }) {
  const athlete = useAthleteProfile();
  const { signOut } = useAuth();
  const { pathname } = useLocation();
  const unread = notifications.filter((n) => !n.read).length;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isActive = (to: string) => pathname === to || pathname.startsWith(to + "/");
  const tabs = nav.filter((n) => TOP_TABS.includes(n.to));
  const more = nav.filter((n) => MENU_ITEMS.includes(n.to));

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
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
    <header className="sticky top-0 z-30 border-b bg-white">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-6 lg:px-8">
        {backTo && (
          <Link to={backTo} direction="back" className="grid h-10 w-10 shrink-0 place-items-center rounded-full border bg-card text-sm" aria-label="Back">
            ←
          </Link>
        )}
        <Link to="/dashboard" direction="root" className="flex shrink-0 items-center gap-2.5" aria-label="Sportal home">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-electric-gradient font-display text-lg font-bold text-primary-foreground shadow-glow">S</span>
          <span className="font-display text-xl font-bold tracking-wide text-foreground">SPORTAL</span>
        </Link>

        <div className="relative hidden w-72 xl:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search skills, rankings, sessions…"
            className="h-10 w-full rounded-full border bg-card pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <nav aria-label="Main" className="flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                direction="root"
                className={cn(
                  "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  isActive(to) ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>

          <span className="mx-2 h-6 w-px bg-border" aria-hidden="true" />

          <Link to="/notifications" direction="root" aria-label={`Notifications, ${unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-full border bg-card">
            <Bell className="h-5 w-5" />
            {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
          </Link>
          <Link to="/profile" direction="root" className="flex items-center gap-2 rounded-full p-1 pr-3" aria-label="My profile">
            <img src={juan} alt="" className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/30" />
            <span className="hidden text-sm font-semibold lg:inline">{athlete.firstName}</span>
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={open}
              className="flex items-center gap-1.5 rounded-full border bg-card px-3 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              <Menu className="h-4 w-4" />
              Menu
              <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
            </button>
            {open && (
              <div role="menu" className="absolute right-0 top-full mt-2 w-60 rounded-2xl border bg-white p-2 shadow-lg">
                {more.map(({ to, label, icon: Icon }) => (
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
        </div>
      </div>
    </header>
  );
}

function HeaderActions() {
  const athlete = useAthleteProfile();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <div className="flex items-center gap-1 pr-2">
      <Link to="/notifications" direction="root" aria-label={`Notifications, ${unread} unread`} className="relative grid h-10 w-10 place-items-center rounded-xl">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />}
      </Link>
      <Link to="/profile" direction="root" className="flex items-center gap-2 rounded-xl p-1 pr-2">
        <img src={juan} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-primary/30" />
        <span className="hidden text-sm font-semibold sm:inline">{athlete.firstName}</span>
      </Link>
    </div>
  );
}
