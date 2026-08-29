"use client";

import { useActionState } from "react";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { adminLogin, type AdminAuthFormState } from "@/app/admin/login-action";

const initialState: AdminAuthFormState = { error: null };

export function AdminLoginForm() {
  const [state, formAction, pending] = useActionState(adminLogin, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-email" className="text-xs font-medium text-white/70">
          Email address
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            id="admin-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@afrodeals.com"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#e89818]/60 focus:bg-white/[0.07]"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="admin-password" className="text-xs font-medium text-white/70">
          Password
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
          <input
            id="admin-password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pr-3 pl-9 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#e89818]/60 focus:bg-white/[0.07]"
          />
        </div>
      </div>

      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group relative mt-2 flex items-center justify-center gap-2 overflow-hidden rounded-lg bg-[linear-gradient(to_right,#082040,#0a2c5c)] py-2.5 text-sm font-semibold text-white shadow-lg transition-shadow duration-200 hover:shadow-[0_0_24px_rgba(232,152,24,0.3)] disabled:opacity-60"
      >
        <span className="absolute inset-0 -translate-x-full bg-[linear-gradient(to_right,transparent,rgba(232,152,24,0.35),transparent)] transition-transform duration-700 group-hover:translate-x-full" />
        <ShieldCheck className="size-4" />
        {pending ? "Signing in…" : "Sign in to dashboard"}
      </button>
    </form>
  );
}
