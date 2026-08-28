"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Country = { code: string; name: string };

export function AddAddressForm({
  action,
  countries,
}: {
  action: (formData: FormData) => Promise<void>;
  countries: Country[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" className="w-fit gap-1.5">
            <Plus className="size-4" />
            Add a new address
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a new address</DialogTitle>
        </DialogHeader>
        <form
          action={async (formData) => {
            await action(formData);
            setOpen(false);
          }}
          className="flex flex-col gap-3"
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="label">Label (optional)</Label>
              <Input id="label" name="label" placeholder="Home, Work…" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient_name">Recipient name</Label>
              <Input id="recipient_name" name="recipient_name" required autoFocus />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="street">Street address</Label>
            <Input id="street" name="street" required />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="postal_code">Postal code</Label>
              <Input id="postal_code" name="postal_code" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="country_code">Country</Label>
              <Select name="country_code" defaultValue={countries[0]?.code}>
                <SelectTrigger id="country_code" className="w-full">
                  <SelectValue placeholder="Country">
                    {(value: string | null) => countries.find((c) => c.code === value)?.name}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button type="submit" className="mt-2 w-full">Add address</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
