import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import type { Database } from "./lib/supabase/database.types";

// Keeps Supabase auth cookies fresh on every request — required because Server Components can't
// write cookies themselves (see the catch in lib/supabase/server.ts).
export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Touching getUser() is what actually triggers the token refresh — do not remove.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Whether sign-in is required just to browse (vs. only to post/message/etc.) is a runtime
  // toggle now — flip it from /admin without a deploy. Defaults to locked-down (true) if the
  // settings row is ever missing/unreadable, matching the original pre-toggle behavior.
  // /admin is exempt from this blanket redirect (not from auth itself) so an anonymous visitor
  // sees the dedicated admin login screen at /admin instead of bouncing to the public /login page
  // -- app/admin/page.tsx still does its own getCurrentUserAndProfile()+isAdminEmail() check and
  // shows the dashboard to nobody else.
  const { data: setting } = await supabase.from("app_settings").select("value").eq("key", "require_login").maybeSingle();
  const requireLogin = setting?.value ?? true;

  const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/help", "/terms", "/safety", "/admin", "/robots.txt", "/sitemap.xml"];
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (requireLogin && !user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
