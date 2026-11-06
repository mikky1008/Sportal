import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { IonContent, IonPage } from "@ionic/react";
import { toast } from "sonner";
import {
  Building2, ClipboardList, Compass, Handshake, LayoutDashboard, LogOut, MessageSquare, Settings, User, UserCheck, Users,
  type LucideIcon,
} from "lucide-react";
import { Link } from "@/router-compat";
import { useAuth } from "@/auth/AuthContext";
import { useCoachProfile } from "@/lib/coachProfileStore";
import {
  AppHeader, DropdownDivider, DropdownLabel, DropdownPanel, HeaderBrand, HeaderNavItem, HeaderPill, HeaderPillDivider,
  HeaderSearch, HeaderUser, MenuGlyph, NotificationBell, PageBody, dropdownItemClass, useDropdown,
} from "@/components/shell";

/**
 * Coach shell. It is built from the same pieces as the Student-Athlete `Page` shell (see
 * components/shell.tsx), so the two top bars match; only the navigation items and the colors
 * (the `.coach-theme` tokens) are the coach's own. Every "home" link points at /coach/dashboard so
 * a coach is never sent to the athlete dashboard.
 *
 * Only Dashboard, My Athletes and Training Plans are real screens so far. The other items have no route yet (on purpose),
 * so they show a "coming soon" message instead of navigating to a page that doesn't exist.
 */
export const COACH_HOME = "/coach/dashboard";

interface NavEntry {
  label: string;
  icon: LucideIcon;
  to?: string;
  /** the entry counts as the current page for any path that starts with this */
  activePrefix?: string;
}

const MAIN_NAV: NavEntry[] = [
  { label: "Dashboard", icon: LayoutDashboard, to: COACH_HOME },
  { label: "My Athletes", icon: Users, to: "/coach/athletes" },
  { label: "Athlete Discovery", icon: Compass },
];

const MORE_NAV: NavEntry[] = [
  { label: "Training Plans", icon: ClipboardList, to: "/coach/training-plans/new", activePrefix: "/coach/training-plans" },
  { label: "Affiliation Requests", icon: UserCheck },
  { label: "Recruitment", icon: Handshake },
  { label: "Messages", icon: MessageSquare },
  { label: "My University", icon: Building2 },
];

const SAMPLE_NOTIFICATIONS = ["New affiliation request from a student-athlete", "A recruiter replied to your inquiry", "An athlete updated their profile"];

const comingSoon = (label: string) => toast(`${label} is coming soon`, { description: "This coach page hasn't been built yet." });

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
  const { pathname } = useLocation();
  const isActive = (to?: string) => !!to && (pathname === to || pathname.startsWith(to + "/"));
  return (
    <div ref={ref} className="relative">
      <HeaderPill>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Coach menu"
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
        <DropdownPanel className="max-h-[calc(100dvh-5rem)] overflow-y-auto">
          {/* phones only: the main links live here (tablet and up has them in the top bar) */}
          <div className="md:hidden">
            {MAIN_NAV.map((item) =>
              item.to ? (
                <Link key={item.label} to={item.to} direction="root" role="menuitem" aria-current={isActive(item.to) ? "page" : undefined} className={dropdownItemClass(isActive(item.to))}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ) : (
                <button key={item.label} type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon(item.label); }}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ),
            )}
            <DropdownDivider />
          </div>
          {/* the former "More" items, on every screen size */}
          {MORE_NAV.map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to} role="menuitem" onClick={() => setOpen(false)}
                aria-current={item.activePrefix && pathname.startsWith(item.activePrefix) ? "page" : undefined}
                className={dropdownItemClass(!!item.activePrefix && pathname.startsWith(item.activePrefix))}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ) : (
              <button key={item.label} type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon(item.label); }}>
                <item.icon className="h-4 w-4" />
                {item.label}
              </button>
            ),
          )}
          <DropdownDivider />
          <button type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon("My Profile"); }}>
            <User className="h-4 w-4" />
            My Profile
          </button>
          <button type="button" role="menuitem" className={dropdownItemClass()} onClick={() => { setOpen(false); comingSoon("Settings"); }}>
            <Settings className="h-4 w-4" />
            Settings
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
  const name = `${profile.firstName} ${profile.lastName}`.trim() || "Coach";
  const isActive = (to?: string) => !!to && (pathname === to || pathname.startsWith(to + "/"));

  return (
    <IonPage>
      <IonContent fullscreen>
        <div className="coach-theme min-h-full bg-background text-foreground">
          <AppHeader>
            <HeaderBrand to={COACH_HOME} label="Sportal coach home" />

            <nav aria-label="Coach" className="ml-2 hidden items-center md:flex">
              {MAIN_NAV.map((item) => (
                <HeaderNavItem key={item.label} label={item.label} icon={item.icon} to={item.to} active={isActive(item.to)} onClick={() => comingSoon(item.label)} />
              ))}
              
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
