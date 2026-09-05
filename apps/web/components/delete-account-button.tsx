"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteAccount } from "@/app/my-account/profile/edit/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";

export function DeleteAccountButton() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, setPending] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button type="button" variant="ghost" className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="size-4" />
            Delete account
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            This signs you out permanently and deletes your login. Your existing listings and
            message history stay intact for the people you&apos;ve dealt with, but your profile
            will show as deleted. Type DELETE to confirm.
          </DialogDescription>
        </DialogHeader>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="w-full rounded-lg border border-input px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            type="button"
            variant="destructive"
            disabled={confirmText !== "DELETE" || pending}
            onClick={async () => {
              setPending(true);
              await deleteAccount();
            }}
          >
            {pending ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
