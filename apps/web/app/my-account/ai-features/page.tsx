import { redirect } from "next/navigation";
import Link from "next/link";
import { Sparkles, PenLine, TrendingUp, Languages, BarChart3 } from "lucide-react";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";

const PLANNED_FEATURES = [
  {
    icon: PenLine,
    title: "AI description polish",
    body: "Turn a rough draft into a clean, well-structured listing description.",
  },
  {
    icon: TrendingUp,
    title: "AI price suggestion",
    body: "A competitive price range based on similar active listings nearby.",
  },
  {
    icon: Languages,
    title: "Listing translation",
    body: "Auto-translate your listing between English and French for a wider audience.",
  },
  {
    icon: BarChart3,
    title: "Seller performance insights",
    body: "Real tips from your own listing data — what gets more views, what sells faster.",
  },
];

// Honest, not fabricated: the one AI feature that's actually live is real (analyzeListingPhoto,
// free OpenRouter vision models). The rest are genuinely planned, not fake "Subscribe" buttons —
// charging for them needs a real payment processor (Stripe/Paystack/Flutterwave), which isn't set
// up here yet. Same treatment as "Enable payments" elsewhere in this account hub.
export default async function AiFeaturesPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Sparkles className="size-6 text-[#008848]" />
        <h1 className="text-2xl font-bold tracking-tight">AI features</h1>
      </div>

      <Card className="border-[#008848]/30 bg-[#008848]/5">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">Photo autofill</CardTitle>
            <Badge className="bg-[#008848]">Free, live now</Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Upload a photo when posting an ad and AI fills in a title, description, and category
            for you — review and edit before you publish, nothing posts automatically.
          </p>
          <Link href="/listings/new" className={buttonVariants({ size: "sm", className: "mt-1 w-fit" })}>
            Post an ad
          </Link>
        </CardContent>
      </Card>

      <div>
        <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">Planned</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {PLANNED_FEATURES.map((f) => (
            <Card key={f.title} className="opacity-75">
              <CardContent className="flex gap-3 pt-6">
                <f.icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">{f.title}</p>
                  <p className="text-sm text-muted-foreground">{f.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        These aren&apos;t built yet — we&apos;d rather say so than show a &quot;Subscribe&quot;
        button that doesn&apos;t actually work. They&apos;ll appear here for real once they exist.
      </p>

      <Link href="/my-account/profile" className={buttonVariants({ variant: "outline", className: "w-fit" })}>
        Back to profile
      </Link>
    </div>
  );
}
