import { useEffect, useState, type ReactNode } from "react";
import { IonContent, IonPage } from "@ionic/react";
import {
  LayoutDashboard, Users, Compass, UserCheck, Handshake, MessageSquare, Building2, User, Settings,
  Bell, Menu, X, Search, type LucideIcon,
} from "lucide-react";
import { Link } from "@/router-compat";
import { cn } from "@/lib/utils";

/**
 * Coach navigation. PART 1 (UI only): only Dashboard is a real screen. The other items are
 * visual placeholders (`to` is left out on purpose) and will get a route in the next parts.
 */
export const coachNav: { label: string; icon: LucideIcon; to?: string; badge?: number }[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: "/coach/dashboard" },
  { label: "My Athletes", icon: Users },
  { label: "Athlete Discovery", icon: Compass },
  { label: "Affiliation Requests", icon: UserCheck, badge: 5 },
  { label: "Recruitment", icon: Handshake },
  { label: "Messages", icon: MessageSquare, badge: 3 },
  { label: "My University", icon: Building2 },
  { label: "My Profile", icon: User },
  { label: "Settings", icon: Settings },
];

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link to="/coach/dashboard" direction="root" className="flex shrink-0 items-center gap-2.5" aria-label="Sportal coach home">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-electric-gradient font-display text-xl font-bold text-primary-foreground shadow-glow">S</span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-2xl font-bold tracking-wide text-foreground">SPORTAL</span>
          <span className="mt-0.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Coach Portal</span>
        </span>
      )}
    </Link>
  );
}

function NavItem({ item, active, compact, onNavigate }: { item: (typeof coachNav)[number]; active: boolean; compact?: boolean; onNavigate?: () => void }) {
  const Icon = item.icon;
  const cls = cn(
    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
    compact && "justify-center px-0",
    active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
  );
  const body = (
    <>
      <Icon className="h-5 w-5 shrink-0" />
      {!compact && <span className="truncate">{item.label}</span>}
      {item.badge ? (
        compact ? (
          <span className="absolute right-2 top-1.5 h-2 w-2 rounded-full bg-destructive" />
        ) : (
          <span className={cn("ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-white/25 text-white" : "bg-primary/10 text-primary")}>{item.badge}</span>
        )
      ) : null}
    </>
  );
  if (item.to) {
    return (
      <Link to={item.to} direction="root" onClick={onNavigate} className={cls} aria-current={active ? "page" : undefined} title={compact ? item.label : undefined}>
        {body}
      </Link>
    );
  }
  // Placeholder: looks like a nav item, goes nowhere yet.
  return (
    <button type="button" className={cn(cls, "w-full text-left")} title={compact ? item.label : "Coming soon"} aria-disabled="true" onClick={(e) => e.preventDefault()}>
      {body}
    </button>
  );
}

function SidebarBody({ compact, onNavigate }: { compact?: boolean; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className={cn("flex h-16 items-center border-b px-4", compact && "justify-center px-2")}>
        <Brand compact={compact} />
      </div>
      <nav aria-label="Coach" className="flex-1 space-y-1 overflow-y-auto p-3">
        {coachNav.map((item) => (
          <NavItem key={item.label} item={item} active={item.label === "Dashboard"} compact={compact} onNavigate={onNavigate} />
        ))}
      </nav>
      {!compact && (
        <div className="m-3 rounded-2xl bg-accent p-4">
          <p className="text-sm font-semibold text-accent-foreground">Build your roster</p>
          <p className="mt-1 text-xs text-muted-foreground">Discover verified student-athletes and send affiliation invites.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Dedicated coach screen: persistent sidebar on desktop, icon rail on tablet,
 * slide-in drawer on phones. Separate from the Student-Athlete `Page` shell.
 */
export function CoachLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="coach-theme flex min-h-full bg-background text-foreground">
          {/* tablet: icon rail · desktop: full sidebar */}
          <aside className="sticky top-0 hidden h-[100dvh] shrink-0 self-start border-r bg-sidebar md:block md:w-[76px] lg:w-[272px]">
            <div className="hidden h-full lg:block"><SidebarBody /></div>
            <div className="h-full lg:hidden"><SidebarBody compact /></div>
          </aside>

          <div className="min-w-0 flex-1">
            <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-card/90 px-4 pt-[var(--ion-safe-area-top,0px)] backdrop-blur sm:px-6 lg:px-8">
              <button type="button" onClick={() => setOpen(true)} aria-label="Open menu" className="grid h-10 w-10 place-items-center rounded-xl border bg-card md:hidden">
                <Menu className="h-5 w-5" />
              </button>
              <div className="md:hidden"><Brand compact /></div>
              <div className="relative ml-1 hidden max-w-md flex-1 sm:block">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" placeholder="Search athletes, requests, messages..." className="h-10 w-full rounded-full border bg-muted pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-4 focus:ring-primary/15" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button type="button" aria-label="Notifications" className="relative grid h-10 w-10 place-items-center rounded-full border bg-card text-muted-foreground transition hover:text-primary">
                  <Bell className="h-5 w-5" />
                  <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-destructive" />
                </button>
              </div>
            </header>
            <main className="px-4 pb-12 pt-6 sm:px-6 lg:px-8">
              <div className="mx-auto max-w-6xl">{children}</div>
            </main>
          </div>
        </div>

        {/* phone drawer */}
        {open && (
          <div className="coach-theme fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Coach menu">
            <button type="button" aria-label="Close menu" className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="absolute inset-y-0 left-0 w-[82%] max-w-[300px] bg-sidebar pt-[var(--ion-safe-area-top,0px)] shadow-xl">
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
              <SidebarBody onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
}
