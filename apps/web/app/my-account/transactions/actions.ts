"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";

export type MarkShippedFormState = { error: string | null; success?: boolean };

// The RPC (mark_order_shipped, 20260101006900_shipping_sla_and_price_drop_alerts.sql) does the
// real seller-ownership + status checks server-side -- this action just forwards form input and
// surfaces its error message, since a crafted request straight to the RPC gets rejected the same
// way anyway.
export async function markOrderShipped(_prevState: MarkShippedFormState, formData: FormData): Promise<MarkShippedFormState> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const orderId = String(formData.get("order_id") || "");
  if (!orderId) return { error: "Missing order." };

  const carrier = String(formData.get("carrier") || "").trim();
  const trackingNumber = String(formData.get("tracking_number") || "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_order_shipped", {
    p_order_id: orderId,
    p_carrier: carrier || null,
    p_tracking_number: trackingNumber || null,
  });

  revalidatePath("/my-account/transactions");
  if (error) return { error: error.message };
  return { error: null, success: true };
}
