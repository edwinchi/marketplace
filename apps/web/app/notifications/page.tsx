import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell, Megaphone, Truck, TrendingDown } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Notifications — AfroDeals" };

type NotificationRow = {
  id: string;
  notification_type: string;
  title: string;
  body: string | null;
  payload: { listing_id?: string } | null;
  read_at: string | null;
  created_at: string;
};

const ICONS: Record<string, typeof Bell> = { new_listing: Megaphone, order_shipped: Truck, price_drop: TrendingDown };

export default async function NotificationsPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, notification_type, title, body, payload, read_at, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50)
    .returns<NotificationRow[]>();

  // Opening this page is what "reading" your notifications means here -- no per-row click target
  // needed just to clear the nav badge. Best-effort: a failed update just leaves the badge showing
  // next load, not worth blocking or erroring the page over.
  const unreadIds = (notifications ?? []).filter((n) => !n.read_at).map((n) => n.id);
  if (unreadIds.length > 0) {
    supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds)
      .then(({ error }) => {
        if (error) console.error("Failed to mark notifications read:", error);
      });
  }

  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-6 flex items-center gap-2 text-xl font-semibold">
        <Bell className="size-5" /> Notifications
      </h1>

      {notifications && notifications.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => {
            const Icon = ICONS[n.notification_type] ?? Bell;
            const listingId = n.payload?.listing_id;
            const content = (
              <>
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#008848]/10 text-[#008848]">
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read_at ? "text-foreground" : "font-semibold text-foreground"}`}>{n.title}</p>
                  {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                {!n.read_at && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#008848]" />}
              </>
            );
            return (
              <li key={n.id}>
                {listingId ? (
                  <Link href={`/listings/x-${listingId}`} className="flex items-start gap-3 rounded-xl border p-4 shadow-sm transition-colors hover:bg-muted/50">
                    {content}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 rounded-xl border p-4 shadow-sm">{content}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-16 text-center">
          <Bell className="size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Nothing here yet — new listings and other updates will show up here.</p>
        </div>
      )}
    </div>
  );
}
