import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { toast } from "sonner";
import {
  Building2, ChevronDown, Compass, Handshake, LayoutDashboard, LogOut, Menu, MessageSquare, User, UserCheck, Users, X,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/router-compat";
import { useAuth } from "@/auth/AuthContext";
import { useCoachProfile } from "@/lib/coachProfileStore";
import {
  AppHeader, DropdownDivider, DropdownLabel, DropdownPanel, HeaderBrand, HeaderNavItem, HeaderPill, HeaderPillDivider,
  HeaderSearch, HeaderUser, MenuGlyph, NotificationBell, PageBody, dropdownItemClass, headerNavClass, useDropdown,
} from "@/components/shell";
import { cn } from "@/lib/utils";

/**
 * Coach shell. It is built from the same pieces as the Student-Athlete `Page` shell (see
 * components/shell.tsx), so the two top bars match; only the navigation items and the colors
 * (the `.coach-theme` tokens) are the coach's own. Every "home" link points at /coach/dashboard so
 * a coach is never sent to the athlete dashboard.
 *
 * Only Dashboard is a real screen so far. The other items have no route yet (on purpose),
 * so they show a "coming soon" message instead of navigating to a page that doesn't exist.
 */
export const COACH_HOME = "/coach/dashboard";

interface NavEntry {
  label: string;
  icon: LucideIcon;
  to?: string;
}

const MAIN_NAV: NavEntry[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: COACH_HOME },
  { label: "My Athletes", icon: Users },
  { label: "Athlete Discovery", icon: Compass },
];

const MORE_NAV: NavEntry[] = [
  { label: "Affiliation Requests", icon: UserCheck },
  { label: "Recruitment", icon: Handshake },
  { label: "Messages", icon: MessageSquare },
  { label: "My University", icon: Building2 },
];

const SAMPLE_NOTIFICATIONS = ["New affiliation request from a student-athlete", "A recruiter replied to your inquiry", "An athlete updated their profile"];

const comingSoon = (label: string) => toast(`${label} is coming soon`, { description: "This coach page hasn't been built yet." });

function MoreDropdown() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} className={headerNavClass(false)}>
        More
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <DropdownPanel className="left-0 right-auto">
          {MORE_NAV.map(({ label, icon: Icon }) => (
            <button key={label} type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon(label); }}>
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </DropdownPanel>
      )}
    </div>
  );
}

function NotificationsMenu() {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} className="relative">
      <NotificationBell count={SAMPLE_NOTIFICATIONS.length} onClick={() => setOpen((v) => !v)} expanded={open} />
      {open && (
        <DropdownPanel className="w-[min(20rem,calc(100vw-2rem))]">
          <DropdownLabel>Notifications · sample data</DropdownLabel>
          {SAMPLE_NOTIFICATIONS.map((t) => (
            <div key={t} className="rounded-xl px-3 py-2.5 text-sm hover:bg-muted">{t}</div>
          ))}
        </DropdownPanel>
      )}
    </div>
  );
}

function ProfileMenu({ name, shortName }: { name: string; shortName: string }) {
  const { open, setOpen, ref } = useDropdown();
  const { signOut } = useAuth();
  return (
    <div ref={ref} className="relative">
      <HeaderPill>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Coach profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2 rounded-full pr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-focus"
        >
          <HeaderUser name={name} shortName={shortName} />
          <HeaderPillDivider />
          <MenuGlyph open={open} />
        </button>
      </HeaderPill>
      {open && (
        <DropdownPanel>
          <button type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon("My Profile"); }}>
            <User className="h-4 w-4" />
            My Profile
          </button>
          <DropdownDivider />
          <button type="button" role="menuitem" className={dropdownItemClass()} onClick={() => void signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </DropdownPanel>
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

  const mobileMenu = mobileOpen && (
    <nav aria-label="Coach mobile" className="border-t border-white/10 px-4 pb-3 pt-2 md:hidden">
      {[...MAIN_NAV, ...MORE_NAV].map((item) => {
        const cls = cn(
          "flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-[15px] font-medium",
          isActive(item.to) ? "bg-white/10 text-shell-fg" : "text-shell-icon",
        );
        return item.to ? (
          <Link key={item.label} to={item.to} direction="root" aria-current={isActive(item.to) ? "page" : undefined} className={cls}>
            <item.icon className="h-5 w-5" />{item.label}
          </Link>
        ) : (
          <button key={item.label} type="button" onClick={() => { setMobileOpen(false); comingSoon(item.label); }} className={cls}>
            <item.icon className="h-5 w-5" />{item.label}
          </button>
        );
      })}
    </nav>
  );

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="coach-theme min-h-full bg-background text-foreground">
          <AppHeader below={mobileMenu}>
            <button
              type="button"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-shell-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-shell-focus md:hidden"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <HeaderBrand to={COACH_HOME} label="Sportal coach home" />

            <nav aria-label="Coach" className="ml-2 hidden items-center md:flex">
              {MAIN_NAV.map((item) => (
                <HeaderNavItem key={item.label} label={item.label} icon={item.icon} to={item.to} active={isActive(item.to)} onClick={() => comingSoon(item.label)} />
              ))}
              <MoreDropdown />
            </nav>

            <HeaderSearch placeholder="Search athletes..." />

            <div className="ml-auto flex items-center gap-2 sm:gap-3">
              <NotificationsMenu />
              <ProfileMenu name={name} shortName={profile.lastName || profile.firstName || name} />
            </div>
          </AppHeader>

          <PageBody>{children}</PageBody>
        </div>
      </IonContent>
    </IonPage>
  );
}
