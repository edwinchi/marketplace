"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { createPostnlLabel } from "@/lib/postnl";

const BUCKET = "shipping-labels";

type ShippingAddress = { name?: string | null; line1?: string | null; line2?: string | null; postal_code?: string | null; city?: string | null; email?: string | null };

// "Create PostNL label" on a paid "Ship with PostNL" order: buys the label under the platform's
// PostNL contract, stores the PDF, and marks the order shipped with the PostNL barcode as tracking
// number (mark_order_shipped re-checks seller + paid status itself).
//
// Idempotent on purpose, because each PostNL call is a real, billed label: the PDF is stored at
// <order id>/<barcode>.pdf, and if one already exists (say the label was bought but marking the
// order shipped then failed) a retry reuses it instead of buying a second label.
export async function createShippingLabel(orderId: string): Promise<{ error: string | null }> {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const service = createServiceClient();
  const { data: order } = await service
    .from("orders")
    .select("id, seller_id, status, shipping_method, shipping_address")
    .eq("id", orderId)
    .maybeSingle();
  if (!order || order.seller_id !== profile.id) return { error: "Order not found." };
  if (order.shipping_method !== "postnl") return { error: "This order isn't a PostNL shipment." };
  if (order.status !== "paid") return { error: "Only paid orders that haven't shipped yet can get a label." };
  const to = (order.shipping_address ?? {}) as ShippingAddress;
  if (!to.line1 || !to.postal_code || !to.city) return { error: "This order has no delivery address — message the buyer." };

  let barcode: string | null = null;
  const { data: existing } = await service.storage.from(BUCKET).list(orderId, { limit: 1 });
  const existingFile = existing?.find((f) => f.name.endsWith(".pdf"));
  if (existingFile) {
    barcode = existingFile.name.replace(/\.pdf$/, "");
  } else {
    const supabase = await createClient();
    const { data: senderAddress } = await supabase
      .from("addresses")
      .select("recipient_name, street, postal_code, city, country_code")
      .eq("profile_id", profile.id)
      .eq("country_code", "NL")
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!senderAddress?.postal_code) {
      return { error: "Add your Dutch return address (with postcode) under Messages → Addresses first." };
    }

    const label = await createPostnlLabel({
      orderReference: order.id,
      sender: { name: senderAddress.recipient_name, streetLine: senderAddress.street, postcode: senderAddress.postal_code, city: senderAddress.city },
      receiver: {
        name: to.name || "Buyer",
        streetLine: [to.line1, to.line2].filter(Boolean).join(" "),
        postcode: to.postal_code,
        city: to.city,
      },
      receiverEmail: to.email,
    });
    if ("error" in label) return { error: label.error };

    barcode = label.barcode;
    const { error: uploadError } = await service.storage
      .from(BUCKET)
      .upload(`${orderId}/${barcode}.pdf`, Buffer.from(label.pdfBase64, "base64"), { contentType: "application/pdf", upsert: true });
    if (uploadError) {
      // The label exists at PostNL -- surface the barcode so it isn't lost even though the PDF is.
      console.error(`Label ${barcode} created for order ${orderId} but storing the PDF failed:`, uploadError);
      return { error: `Label created (barcode ${barcode}) but couldn't be saved — contact support rather than retrying.` };
    }
  }

  const supabase = await createClient();
  const { error: shipError } = await supabase.rpc("mark_order_shipped", { p_order_id: orderId, p_carrier: "PostNL", p_tracking_number: barcode });
  if (shipError) return { error: shipError.message };
  await service.from("shipments").update({ label_storage_key: `${orderId}/${barcode}.pdf` }).eq("order_id", orderId);

  revalidatePath("/my-account/transactions");
  return { error: null };
}

// Seller-only download of a stored label, through a short-lived signed URL (the bucket is private).
export async function downloadShippingLabel(orderId: string) {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const service = createServiceClient();
  const { data: order } = await service.from("orders").select("seller_id, shipments(label_storage_key)").eq("id", orderId).maybeSingle();
  const shipment = Array.isArray(order?.shipments) ? order?.shipments[0] : order?.shipments;
  if (!order || order.seller_id !== profile.id || !shipment?.label_storage_key) redirect("/my-account/transactions");

  const { data } = await service.storage.from(BUCKET).createSignedUrl(shipment.label_storage_key, 300, { download: true });
  redirect(data?.signedUrl ?? "/my-account/transactions");
}
