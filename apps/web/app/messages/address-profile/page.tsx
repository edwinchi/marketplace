import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/supabase/profile";
import { ANCHOR_COUNTRIES } from "@/lib/countries";
import { addAddress, deleteAddress } from "./actions";
import { AddAddressForm } from "@/components/add-address-form";
import { BackButton } from "@/components/back-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AddressBookPage() {
  const { profile } = await getCurrentUserAndProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();
  const { data: addresses } = await supabase
    .from("addresses")
    .select("id, label, recipient_name, street, city, postal_code, country_code")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <BackButton />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-bold tracking-tight">Address book</h1>
        <p className="text-sm text-muted-foreground">
          Your addresses are only visible to yourself, until you share them with another user.
          They won&apos;t be shown on your listings.
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-4 pt-6">
          {addresses?.length ? (
            <div className="flex flex-col gap-3">
              {addresses.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 rounded-lg border p-4">
                  <div className="text-sm">
                    {a.label && (
                      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{a.label}</p>
                    )}
                    <p className="font-medium">{a.recipient_name}</p>
                    <p className="text-muted-foreground">{a.street}</p>
                    <p className="text-muted-foreground">{[a.postal_code, a.city].filter(Boolean).join(" ")}</p>
                  </div>
                  <form action={deleteAddress}>
                    <input type="hidden" name="id" value={a.id} />
                    <Button type="submit" variant="ghost" size="icon" className="size-8 text-muted-foreground">
                      <Trash2 className="size-4" />
                    </Button>
                  </form>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No saved addresses yet.</p>
          )}

          <AddAddressForm action={addAddress} countries={ANCHOR_COUNTRIES} />
        </CardContent>
      </Card>
    </div>
  );
}
