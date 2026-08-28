import Link from "next/link";
import { redirect } from "next/navigation";
import { Info } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { unfollowSeller } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function FavoriteSellersPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: follows } = await supabase
    .from("favorite_sellers")
    .select("seller_profile_id, profiles!favorite_sellers_seller_profile_id_fkey(id, username, display_name)")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  const sellers = (follows ?? []).map((f) => (Array.isArray(f.profiles) ? f.profiles[0] : f.profiles)).filter((s) => !!s);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Preferred sellers</h1>
      {sellers.length ? (
        <div className="flex flex-col gap-2">
          {sellers.map((s) => (
            <Card key={s.id}>
              <CardContent className="flex items-center justify-between gap-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {(s.display_name || s.username).charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{s.display_name || s.username}</span>
                </div>
                <form action={unfollowSeller}>
                  <input type="hidden" name="sellerProfileId" value={s.id} />
                  <input type="hidden" name="returnTo" value="/my-account/favorite-sellers" />
                  <Button type="submit" variant="outline" size="sm">Remove</Button>
                </form>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="rounded-xl border py-10" />
          <div className="flex items-start gap-2 rounded-lg border bg-primary/5 p-4 text-sm">
            <Info className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">You don&apos;t have any preferred sellers yet</p>
              <p className="mt-1 text-muted-foreground">
                Found an interesting listing? Follow the seller from their listing page to keep an
                eye on what they post next.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
