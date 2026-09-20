"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Bold, Italic, Underline as UnderlineIcon, List } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// Wraps the value the same way a real typed edit would (the native value setter + a real "input"
// event), not a direct .value assignment -- that's what makes React's own onChange fire (it tracks
// the native setter, not a plain property write) and keeps the browser's native undo stack (Ctrl+Z)
// intact. The old document.execCommand approach does this too, but it's deprecated and
// inconsistent across browsers; this is the same trick React Testing Library uses to simulate typing.
function setNativeValue(el: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

// Wraps the current selection with `before`/`after` (or inserts `placeholder` between them if
// nothing's selected), matching the markers RichDescription's parseInline reads back out: **bold**,
// *italic*, ++underline++ (the last one is this app's own convention -- markdown has no standard
// underline marker).
function wrapSelection(el: HTMLTextAreaElement, before: string, after: string, placeholder: string) {
  const { selectionStart, selectionEnd, value } = el;
  const selected = value.slice(selectionStart, selectionEnd) || placeholder;
  const newValue = value.slice(0, selectionStart) + before + selected + after + value.slice(selectionEnd);
  setNativeValue(el, newValue);
  el.focus();
  const start = selectionStart + before.length;
  el.setSelectionRange(start, start + selected.length);
}

// Toggles a line prefix (just "- ", matching RichDescription's bullet marker) across every line
// touched by the current selection -- toggles off if every touched line already has it, matching
// how a real bullet-list button behaves (click again to remove).
function toggleLinePrefix(el: HTMLTextAreaElement, prefix: string) {
  const { selectionStart, selectionEnd, value } = el;
  const lineStart = value.lastIndexOf("\n", selectionStart - 1) + 1;
  const nextBreak = value.indexOf("\n", selectionEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const allPrefixed = lines.every((l) => l.startsWith(prefix) || l.trim() === "");
  const nextLines = lines.map((l) => {
    if (l.trim() === "") return l;
    return allPrefixed ? l.slice(prefix.length) : prefix + l;
  });
  const newValue = value.slice(0, lineStart) + nextLines.join("\n") + value.slice(lineEnd);
  setNativeValue(el, newValue);
  el.focus();
}

function ToolbarButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      // tabIndex -1 + onMouseDown preventDefault: a real click here must not steal focus away from
      // the textarea, or the selection wrapSelection/toggleLinePrefix read would already be gone.
      tabIndex={-1}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
    >
      {children}
    </button>
  );
}

// A toolbar-assisted editor for listing descriptions -- Bold/Italic/Underline/Bullet-list buttons
// that wrap the current textarea selection in the same lightweight markers RichDescription already
// knows how to render (see components/listings/rich-description.tsx), rather than a full WYSIWYG
// editor backed by stored HTML. Keeps the storage format exactly what it's always been (a plain
// string) -- no schema change, and the embedding/translation/moderation pipelines that already treat
// `description` as literal plain text keep working unchanged; the markers are just characters within
// that same string. Forwards its ref to the underlying textarea element so existing callers (e.g.
// listing-form.tsx's AI "polish" button, which reads descriptionRef.current?.value) work unmodified.
export const DescriptionEditor = forwardRef<HTMLTextAreaElement, React.ComponentProps<typeof Textarea>>(function DescriptionEditor(
  { className, ...props },
  forwardedRef,
) {
  const innerRef = useRef<HTMLTextAreaElement>(null);
  useImperativeHandle(forwardedRef, () => innerRef.current as HTMLTextAreaElement);

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-0.5 rounded-t-lg border border-b-0 border-input bg-muted/40 p-1">
        <ToolbarButton label="Bold" onClick={() => innerRef.current && wrapSelection(innerRef.current, "**", "**", "bold text")}>
          <Bold className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" onClick={() => innerRef.current && wrapSelection(innerRef.current, "*", "*", "italic text")}>
          <Italic className="size-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Underline" onClick={() => innerRef.current && wrapSelection(innerRef.current, "++", "++", "underlined text")}>
          <UnderlineIcon className="size-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton label="Bullet list" onClick={() => innerRef.current && toggleLinePrefix(innerRef.current, "- ")}>
          <List className="size-3.5" />
        </ToolbarButton>
      </div>
      <Textarea ref={innerRef} className={cn("rounded-t-none", className)} {...props} />
    </div>
  );
});
