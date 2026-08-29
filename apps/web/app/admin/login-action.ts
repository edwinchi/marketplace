"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

export type AdminAuthFormState = { error: string | null };

// Single generic error for both "wrong password" and "correct password, not the admin
// account" -- a non-admin visitor shouldn't be able to tell which case they hit.
const GENERIC_ERROR = "Invalid email or password.";

export async function adminLogin(
  _prevState: AdminAuthFormState,
  formData: FormData
): Promise<AdminAuthFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: GENERIC_ERROR };

  if (!isAdminEmail(data.user?.email)) {
    await supabase.auth.signOut();
    return { error: GENERIC_ERROR };
  }

  redirect("/admin");
}
