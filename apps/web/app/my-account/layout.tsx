import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { AccountSidebar } from "@/components/account-sidebar";

// Grouped sidebar (Account / Selling / Buying) — only lists sections this app actually has
// something behind, no settings link that opens onto nothing.
export default async function MyAccountLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row lg:px-8">
      <aside className="w-full shrink-0 md:w-52">
        <AccountSidebar />
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
