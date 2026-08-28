"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type ChangeEmailState = { error: string | null; sent: boolean };

// Supabase Auth's own updateUser({ email }) — real, built-in capability, not something bolted on.
// It sends a confirmation link to the new address (and, depending on the project's
// secure_email_change setting, the old one too) rather than switching immediately.
export async function changeEmail(_prevState: ChangeEmailState, formData: FormData): Promise<ChangeEmailState> {
  const newEmail = String(formData.get("new_email") || "").trim();
  if (!newEmail) return { error: "Enter a new email address.", sent: false };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) return { error: error.message, sent: false };

  return { error: null, sent: true };
}
