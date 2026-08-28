import Link from "next/link";

type Row = {
  id: string;
  otherName: string;
  listingTitle: string;
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
};

export function ConversationList({ rows, activeId }: { rows: Row[]; activeId?: string }) {
  if (rows.length === 0) {
    return (
      <p className="p-4 text-sm text-muted-foreground">
        No conversations yet. Message a seller from any listing to start one.
      </p>
    );
  }

  return (
    <ul className="flex flex-1 flex-col divide-y overflow-y-auto">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/messages?c=${r.id}`}
            className={`flex flex-col gap-0.5 px-4 py-3 transition-colors hover:bg-muted/60 ${activeId === r.id ? "bg-muted/80" : ""}`}
          >
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
          </Link>
        </li>
      ))}
    </ul>
  );
}
