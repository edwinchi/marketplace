import { redirect } from "next/navigation";
import Link from "next/link";
import { Search, Info, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { deleteSavedSearch } from "./actions";
import { SavedSearchToggle } from "@/components/saved-search-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function SavedSearchesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: searches } = await supabase
    .from("saved_searches")
    .select("id, name, query_text, notify_push, notify_email, created_at")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold tracking-tight">Saved searches</h1>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-3 lg:col-span-2">
          {searches?.length ? (
            searches.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex flex-col gap-3 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <p className="font-medium">{s.name || s.query_text || "Saved search"}</p>
                    <form action={deleteSavedSearch}>
                      <input type="hidden" name="id" value={s.id} />
                      <Button type="submit" variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                        <Trash2 className="size-3.5" />
                        Remove
                      </Button>
                    </form>
                  </div>
                  <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <SavedSearchToggle id={s.id} channel="push" checked={s.notify_push} />
                      <span className="text-muted-foreground">Push notifications</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <SavedSearchToggle id={s.id} channel="email" checked={s.notify_email} />
                      <span className="text-muted-foreground">Email</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
              <Search className="size-10 text-muted-foreground" />
              <p className="font-medium">No saved searches yet.</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Search for something on the homepage, then save it to get notified about new matches.
              </p>
              <Link href="/">
                <Button className="mt-2">Start searching</Button>
              </Link>
            </div>
          )}
        </div>
        <div className="flex items-start gap-2 rounded-lg border bg-primary/5 p-4 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            <span className="font-semibold">Found what you were looking for?</span> Remove the saved search once you don&apos;t need updates for it anymore.
          </p>
        </div>
      </div>
    </div>
  );
}
