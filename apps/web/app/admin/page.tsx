import Link from "next/link";
import {
  Users, Store, MessageSquare, Heart, Handshake, Star, Sparkles, DollarSign,
  Building2, User as UserIcon, TrendingUp, MapPin, Tag, Clock,
} from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { isAdminEmail } from "@/lib/admin";
import { getAdminStats } from "@/lib/admin-stats";
import { formatPrice } from "@/lib/money";
import { AdminLoginForm } from "@/components/admin/admin-login-form";
import { RequireLoginToggle } from "@/components/admin/require-login-toggle";
import { LanguageToggles } from "@/components/admin/language-toggles";
import { CollapsedLimitSetting } from "@/components/admin/collapsed-limit-setting";
import { getRequireLoginSetting } from "@/lib/app-settings";
import { getDisabledLocales } from "@/lib/language-settings";
import { getNumericSetting } from "@/lib/numeric-settings";
import { slugPath } from "@/lib/slug";

function AdminLoginScreen() {
  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden bg-[linear-gradient(155deg,#082040_0%,#0a2c5c_55%,#063018_100%)] px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-[#e89818]/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -bottom-32 size-96 rounded-full bg-[#008848]/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] bg-size-[28px_28px]"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center">
          <div className="rounded-2xl bg-white px-6 py-3 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="AfroDeals" className="h-10 w-auto" />
          </div>
        </div>

        <div className="rounded-2xl border border-white/50 bg-white/60 p-8 shadow-2xl backdrop-blur-xl">
          <div className="mb-6 text-center">
            <p className="text-xs font-semibold tracking-widest text-[#b97a0f] uppercase">Restricted access</p>
            <h1 className="mt-1 text-xl font-bold text-[#082040]">Executive Dashboard</h1>
            <p className="mt-2 text-sm text-[#082040]/60">Sign in with your administrator account to continue.</p>
          </div>
          <AdminLoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/30">
          <Link href="/" className="underline underline-offset-2 hover:text-white/60">
            Back to AfroDeals
          </Link>
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sublabel,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  sublabel?: string;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-4 rounded-xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <span className={`flex size-11 shrink-0 items-center justify-center rounded-full ${accent}`}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {sublabel && <p className="mt-0.5 text-xs text-muted-foreground/80">{sublabel}</p>}
      </div>
    </div>
  );
}

function BarRow({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-40 shrink-0 truncate text-muted-foreground">{label}</span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[linear-gradient(to_right,#082040,#e89818)] transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 shrink-0 text-right font-semibold">{count}</span>
    </div>
  );
}

export default async function AdminDashboardPage() {
  const { user } = await getCurrentUserAndProfile();
  if (!user || !isAdminEmail(user.email)) return <AdminLoginScreen />;

  const [stats, requireLogin, disabledLocales, collapsedLimit] = await Promise.all([
    getAdminStats(),
    getRequireLoginSetting(),
    getDisabledLocales(),
    getNumericSetting("category_group_collapsed_limit"),
  ]);
  const maxCategory = Math.max(1, ...stats.topCategories.map(([, c]) => c));
  const maxCity = Math.max(1, ...stats.topCities.map(([, c]) => c));

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b pb-6">
        <div>
          <p className="text-xs font-semibold tracking-wide text-[#e89818] uppercase">AfroDeals</p>
          <h1 className="text-2xl font-bold tracking-tight text-[#082040]">Executive Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">Real, live figures straight from the database — no sample or placeholder data.</p>
        </div>
        <Link href="/" className="rounded-lg border px-3 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-0.5 hover:border-[#e89818]/50">
          Back to site
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RequireLoginToggle initial={requireLogin} />
        <LanguageToggles disabledLocales={[...disabledLocales]} />
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <p className="text-sm font-semibold text-[#082040]">Category pages</p>
          <CollapsedLimitSetting initial={collapsedLimit} />
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total users" value={stats.totalUsers} sublabel={`${stats.businessUsers} business · ${stats.privateUsers} private`} accent="bg-[#082040]/10 text-[#082040]" />
        <StatCard icon={Store} label="Active listings" value={stats.activeListings} sublabel={`${stats.deletedListings} removed`} accent="bg-[#e89818]/10 text-[#e89818]" />
        <StatCard
          icon={DollarSign}
          label="Active inventory value"
          value={formatPrice(stats.totalValueUsd, "USD")}
          sublabel={stats.valueConvertedFrom < stats.valueTotalActive ? `${stats.valueTotalActive - stats.valueConvertedFrom} listing(s) not convertible` : "Converted to USD live"}
          accent="bg-[#008848]/10 text-[#008848]"
        />
        <StatCard icon={Sparkles} label="AI photo analyses used" value={stats.totalAiUses} sublabel="Across all accounts" accent="bg-[#082040]/10 text-[#082040]" />
      </div>

      {/* Secondary KPIs */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard icon={MessageSquare} label="Conversations" value={stats.totalConversations} sublabel={`${stats.totalMessages} messages`} accent="bg-muted text-foreground" />
        <StatCard icon={Handshake} label="Offers made" value={stats.totalOffers} accent="bg-muted text-foreground" />
        <StatCard icon={Heart} label="Favorites" value={stats.totalFavorites} accent="bg-muted text-foreground" />
        <StatCard icon={Star} label="Reviews" value={stats.totalReviews} accent="bg-muted text-foreground" />
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top categories */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#082040]">
            <Tag className="size-4" /> Top categories by active listings
          </h2>
          {stats.topCategories.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stats.topCategories.map(([name, count]) => (
                <BarRow key={name} label={name} count={count} max={maxCategory} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active listings yet.</p>
          )}
        </div>

        {/* Top cities */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#082040]">
            <MapPin className="size-4" /> Top cities by active listings
          </h2>
          {stats.topCities.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {stats.topCities.map(([name, count]) => (
                <BarRow key={name} label={name} count={count} max={maxCity} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active listings yet.</p>
          )}
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent listings */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#082040]">
            <TrendingUp className="size-4" /> Most recent listings
          </h2>
          <div className="flex flex-col gap-3">
            {stats.recentListings.map((l) => (
              <Link key={l.id} href={`/listings/${slugPath(l.title, l.id)}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm transition-colors hover:bg-accent/40">
                <div className="min-w-0">
                  <p className="truncate font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.sellerName} · {l.status}</p>
                </div>
                <span className="shrink-0 font-semibold">{formatPrice(l.priceMinor ?? 0, l.currency)}</span>
              </Link>
            ))}
            {stats.recentListings.length === 0 && <p className="text-sm text-muted-foreground">No listings yet.</p>}
          </div>
        </div>

        {/* Recent users */}
        <div className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#082040]">
            <Clock className="size-4" /> Most recent sign-ups
          </h2>
          <div className="flex flex-col gap-3">
            {stats.recentUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  {u.accountType === "business" ? <Building2 className="size-4" /> : <UserIcon className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{u.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">{u.accountType}</p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</span>
              </div>
            ))}
            {stats.recentUsers.length === 0 && <p className="text-sm text-muted-foreground">No users yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
