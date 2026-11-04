import { Page } from "@/components/Page";
import { useState } from "react";
import { notifications as seed } from "@/data/mock";
import type { NotificationCategory } from "@/types";
import { PageHeader, btn } from "@/components/common";
import { NotificationItem, notificationCategories } from "@/components/listings";
import { cn } from "@/lib/utils";


function Notifications() {
  const [items, setItems] = useState(seed);
  const [cat, setCat] = useState<NotificationCategory | "all">("all");
  const list = cat === "all" ? items : items.filter((n) => n.category === cat);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Notifications" action={<button className={btn.secondary} onClick={() => setItems((x) => x.map((n) => ({ ...n, read: true })))}>Mark all read</button>} />
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
        {(["all", ...Object.keys(notificationCategories)] as const).map((c) => (
          <button key={c} onClick={() => setCat(c as NotificationCategory | "all")} className={cn("whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold", cat === c ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground")}>
            {c === "all" ? "All" : notificationCategories[c as NotificationCategory].label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {list.map((n) => <NotificationItem key={n.id} n={n} onRead={() => setItems((x) => x.map((y) => (y.id === n.id ? { ...y, read: true } : y)))} />)}
        {!list.length && <p className="py-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>}
      </ul>
    </div>
  );
}

export default function NotificationsPage() {
  return (
    <Page title="Notifications">
      <Notifications />
    </Page>
  );
}
