import { useState } from "react";
import { IonContent, IonMenu, IonMenuToggle } from "@ionic/react";
import { useLocation } from "react-router-dom";
import {
  LayoutDashboard, User, Activity, Trophy, GraduationCap, UserSearch, Bell, Settings, Plus, LogOut,
} from "lucide-react";
import { notifications } from "@/data/mock";
import { Link } from "@/router-compat";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import { useIsDesktop } from "@/lib/useIsDesktop";

export const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/profile", label: "My Profile", icon: User },
  { to: "/performance", label: "Performance", icon: Activity },
  { to: "/rankings", label: "Rankings", icon: Trophy },
  { to: "/scholarships", label: "Scholarships", icon: GraduationCap },
  { to: "/recruiting", label: "Recruiting", icon: UserSearch },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const tabs = [nav[0], nav[2], nav[3], nav[1]] as const;

function useIsActive() {
  const { pathname } = useLocation();
  return (to: string) => pathname === to || pathname.startsWith(to + "/");
}

/** Side menu: slides in on phones, stays open as a sidebar on tablets and wider (IonSplitPane). */
export function SideMenu() {
  const isActive = useIsActive();
  const { signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const desktop = useIsDesktop();
  const unread = notifications.filter((n) => !n.read).length;

  async function onSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <IonMenu contentId="main" className="sportal-menu">
      <IonContent className="sportal-menu-content">
        <div className="flex h-full flex-col px-4 py-6">
          <div className="mb-8 flex items-center gap-2.5 px-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-electric-gradient font-display text-lg font-bold text-primary-foreground shadow-glow">S</span>
            <span className="font-display text-xl font-bold tracking-wide text-sidebar-accent-foreground">SPORTAL</span>
          </div>
          <nav aria-label="Main" className="flex flex-1 flex-col gap-1">
            {nav.map(({ to, label, icon: Icon }) => (
              <IonMenuToggle key={to} autoHide={false}>
                <Link
                  to={to}
                  direction="root"
                  className={cn(
                    "relative flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground transition-colors",
                    isActive(to) && "bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                >
                  {isActive(to) && <span className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r bg-sidebar-primary" />}
                  <Icon className={cn("h-5 w-5 shrink-0", isActive(to) && "text-sidebar-primary")} />
                  <span>{label}</span>
                  {to === "/notifications" && unread > 0 && (
                    <span className="ml-auto grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-bold text-navy">{unread}</span>
                  )}
                </Link>
              </IonMenuToggle>
            ))}
          </nav>
          <div className="mt-4 rounded-2xl bg-sidebar-accent p-4">
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-sidebar-primary">Train. Track.</p>
            <p className="font-display text-sm font-semibold uppercase tracking-wider text-sidebar-accent-foreground">Improve. Get Discovered.</p>
            <IonMenuToggle autoHide={false}>
              <Link to="/performance/new" className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-electric-gradient py-2.5 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> New Practice
              </Link>
            </IonMenuToggle>
          </div>
          {!desktop && (
            <button
              onClick={onSignOut}
              disabled={signingOut}
              className="mt-3 flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-sidebar-foreground disabled:opacity-60"
            >
              <LogOut className="h-5 w-5" /> Sign out
            </button>
          )}
        </div>
      </IonContent>
    </IonMenu>
  );
}

/** Phone tab bar: Dashboard, Performance, a big Practice button, Rankings, Profile. */
export function BottomNav() {
  const isActive = useIsActive();
  const { pathname } = useLocation();
  return (
    <nav aria-label="Mobile" className="border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <div className="grid grid-cols-5 items-end">
        {tabs.slice(0, 2).map((item) => (
          <TabItem key={item.to} {...item} active={isActive(item.to) && pathname !== "/performance/new"} />
        ))}
        <Link to="/performance/new" aria-label="Start new practice" className="-mt-6 flex flex-col items-center pb-2">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-electric-gradient text-primary-foreground shadow-glow"><Plus className="h-7 w-7" /></span>
          <span className="mt-1 text-[11px] font-semibold text-primary">Practice</span>
        </Link>
        {tabs.slice(2).map((item) => (
          <TabItem key={item.to} {...item} active={isActive(item.to)} />
        ))}
      </div>
    </nav>
  );
}

function TabItem({ to, label, icon: Icon, active }: { to: string; label: string; icon: typeof User; active: boolean }) {
  return (
    <Link to={to} direction="root" className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground", active && "text-primary")}>
      <Icon className="h-6 w-6" />
      {label.replace("My ", "")}
    </Link>
  );
}
