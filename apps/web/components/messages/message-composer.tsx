"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, ImagePlus, MapPin, X } from "lucide-react";
import { sendMessage, sendMessagePhoto, sendMessageAddress } from "@/app/messages/actions";
import { Button } from "@/components/ui/button";

// addressStarter: the sender's own profile city, if they've set one -- not a full address (this
// project collects no street-address field), just a starting point they edit and confirm before
// anything is sent. See sendMessageAddress's own comment for why this isn't auto-filled/auto-sent.
export function MessageComposer({ conversationId, addressStarter }: { conversationId: string; addressStarter: string }) {
  const [value, setValue] = useState("");
  const [addressOpen, setAddressOpen] = useState(false);
  const [addressValue, setAddressValue] = useState(addressStarter);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  function submit() {
    const content = value.trim();
    if (!content || pending) return;
    setValue("");
    startTransition(async () => {
      await sendMessage(conversationId, content);
      // revalidatePath inside the action invalidates the cache, but this already-mounted page
      // doesn't refetch on its own — router.refresh() is what actually pulls the new message
      // (and everyone else's) into view without a full page reload.
      router.refresh();
    });
  }

  function handlePhotoPicked(file: File | undefined) {
    if (!file || pending) return;
    setError(null);
    const formData = new FormData();
    formData.set("photo", file);
    startTransition(async () => {
      const result = await sendMessagePhoto(conversationId, formData);
      if (result.error) setError(result.error);
      router.refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  function submitAddress() {
    const text = addressValue.trim();
    if (!text || pending) return;
    setError(null);
    startTransition(async () => {
      const result = await sendMessageAddress(conversationId, text);
      if (result.error) setError(result.error);
      else setAddressOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="border-t bg-card">
      <form
        ref={formRef}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex items-end gap-2 p-3 pb-2"
      >
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Write your message here. Use Shift+Enter for a new line"
          rows={1}
          className="max-h-32 flex-1 resize-none rounded-2xl border bg-muted/40 px-4 py-2.5 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
        />
        <Button
          type="submit"
          size="icon"
          disabled={pending || !value.trim()}
          aria-label="Send message"
          className="size-10 shrink-0 rounded-full bg-[#008200] text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#d4f5d4] hover:text-[#006800] hover:shadow-md disabled:hover:translate-y-0 disabled:hover:bg-[#008200] disabled:hover:text-white"
        >
          <Send className="size-4" />
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handlePhotoPicked(e.target.files?.[0])}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-full bg-[#008200] px-3 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#d4f5d4] hover:text-[#006800] disabled:pointer-events-none disabled:opacity-50"
        >
          <ImagePlus className="size-3.5" />
          Share photos
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => setAddressOpen((v) => !v)}
          className="flex items-center gap-1.5 rounded-full bg-[#008200] px-3 py-1.5 text-xs font-medium text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#d4f5d4] hover:text-[#006800] disabled:pointer-events-none disabled:opacity-50"
        >
          <MapPin className="size-3.5" />
          Share address
        </button>
      </div>

      {addressOpen && (
        <div className="flex flex-col gap-2 border-t bg-muted/30 p-3">
          <label className="text-xs font-medium text-muted-foreground">Confirm the address to share</label>
          <div className="flex items-end gap-2">
            <textarea
              value={addressValue}
              onChange={(e) => setAddressValue(e.target.value)}
              rows={2}
              placeholder="Street, city, postal code…"
              className="flex-1 resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
            <Button
              type="button"
              size="icon"
              disabled={pending || !addressValue.trim()}
              onClick={submitAddress}
              aria-label="Send address"
              className="size-10 shrink-0 rounded-full bg-[#008200] text-white shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:bg-[#d4f5d4] hover:text-[#006800]"
            >
              <Send className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setAddressOpen(false)}
              aria-label="Cancel sharing address"
              className="size-10 shrink-0 rounded-full"
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {error && <p className="px-3 pb-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
