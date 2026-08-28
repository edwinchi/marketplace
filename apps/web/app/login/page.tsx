import { redirect } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ tab?: string; next?: string }> }) {
  const { user } = await getCurrentUserAndProfile();
  const { tab, next } = await searchParams;
  // Only a same-site relative path is honored — "next" comes from a URL query param, so treating
  // it as a trusted redirect target without this check would be an open-redirect hole.
  const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (user) redirect(safeNext);

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-16">
      <AuthCard initialTab={tab === "signup" ? "signup" : "login"} next={safeNext} />
    </div>
  );
}
