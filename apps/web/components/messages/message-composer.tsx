"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { sendMessage } from "@/app/messages/actions";
import { Button } from "@/components/ui/button";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
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

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="flex items-end gap-2 border-t bg-card p-3"
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
        className="size-10 shrink-0 rounded-full shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md disabled:hover:translate-y-0"
      >
        <Send className="size-4" />
      </Button>
    </form>
  );
}
