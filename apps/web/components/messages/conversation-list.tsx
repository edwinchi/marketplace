import Link from "next/link";
import { MessagesSquare } from "lucide-react";

type Row = {
  id: string;
  otherName: string;
  listingTitle: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

// Deterministic per-name color so the same seller always gets the same avatar tint across the
// list, without needing to store anything -- picked from the brand palette plus a couple of
// neighbors so distinct people are visually distinguishable at a glance.
const AVATAR_TINTS = [
  "bg-[#e89818]/15 text-[#a3690b]",
  "bg-[#008848]/15 text-[#046637]",
  "bg-[#082040]/10 text-[#082040]",
  "bg-[#3b6fe0]/15 text-[#2a51ad]",
  "bg-[#c0447a]/15 text-[#9c3562]",
];
function tintFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

export function ConversationList({ rows, activeId }: { rows: Row[]; activeId?: string }) {
  if (rows.length === 0) {
    return (
      <div className="m-auto flex max-w-52 flex-col items-center gap-2 p-6 text-center">
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <MessagesSquare className="size-5" />
        </span>
        <p className="text-sm text-muted-foreground">No conversations yet. Message a seller from any listing to start one.</p>
      </div>
    );
  }

  return (
    <ul className="flex flex-1 flex-col overflow-y-auto p-1.5">
      {rows.map((r) => {
        const active = activeId === r.id;
        return (
          <li key={r.id}>
            <Link
              href={`/messages?c=${r.id}`}
              className={`group flex items-center gap-3 rounded-xl px-2.5 py-2.5 transition-all duration-150 ${
                active ? "bg-primary/10" : "hover:bg-muted/70"
              }`}
            >
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${tintFor(r.otherName)}`}>
                {r.otherName.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`truncate text-sm ${r.unreadCount > 0 ? "font-semibold" : "font-medium"}`}>{r.otherName}</span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(r.lastMessageAt).toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </span>
                </div>
                <p className="truncate text-xs text-muted-foreground">{r.listingTitle}</p>
                <div className="flex items-center justify-between gap-2">
                  <p className={`truncate text-xs ${r.unreadCount > 0 ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                    {r.lastMessagePreview || "No messages yet"}
                  </p>
                  {r.unreadCount > 0 && (
                    <span className="flex size-4.5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                      {r.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
