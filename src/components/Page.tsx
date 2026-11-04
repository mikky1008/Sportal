import type { ReactNode } from "react";
import {
  IonBackButton, IonButtons, IonContent, IonFooter, IonHeader, IonMenuButton, IonPage, IonTitle, IonToolbar,
} from "@ionic/react";
import { Bell } from "lucide-react";
import { notifications } from "@/data/mock";
import { useAthleteProfile } from "@/lib/profileStore";
import { Link } from "@/router-compat";
import { BottomNav } from "@/layouts/Nav";
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
  if (!shell) {
    return (
      <IonPage>
        <IonContent fullscreen>{children}</IonContent>
      </IonPage>
    );
  }
  return (
    <IonPage>
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
      <IonContent fullscreen>
        <div className="px-4 pb-10 pt-5 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </div>
      </IonContent>
      {!hideTabs && (
        <IonFooter className="md:hidden">
          <BottomNav />
        </IonFooter>
      )}
    </IonPage>
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
