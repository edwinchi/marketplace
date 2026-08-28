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

  // TEMPORARY, while the site is still incomplete: sign-in is required to view anything, not just
  // to post/use AI features. Previously this was a denylist (only /listings/new gated, browsing
  // stayed public) — reverted per explicit instruction to lock down browsing until launch. To
  // restore public browsing later, swap back to the denylist approach this replaced (protect only
  // /listings/new, leave everything else out of PUBLIC_PATHS/isPublic below).
  const PUBLIC_PATHS = ["/login", "/signup", "/forgot-password", "/reset-password", "/auth", "/help", "/terms", "/safety"];
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
