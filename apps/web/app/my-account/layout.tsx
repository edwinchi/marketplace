import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { AccountSidebar } from "@/components/account-sidebar";

// Structurally inspired by a typical marketplace account hub (grouped sidebar: Account / Selling
// / Buying) but only lists sections this app actually has something behind — no "Marketing
// preferences" or "Digital invoice" links, since none of those exist here yet. Same reasoning as
// the listing page's deliberately-omitted star ratings (no reviews system anywhere in this
// schema) — a settings link that opens onto nothing is exactly the kind of thing this project has
// consistently avoided.
export default async function MyAccountLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
      <aside className="w-full shrink-0 md:w-52">
        <AccountSidebar profileName={profile.display_name || profile.username} />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
