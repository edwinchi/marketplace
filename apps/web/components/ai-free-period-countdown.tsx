"use client";

import { useEffect, useState } from "react";

type Labels = { days: string; hours: string; minutes: string; seconds: string; ended: string };

function remaining(endMs: number, nowMs: number) {
  const total = Math.max(0, endMs - nowMs);
  const s = Math.floor(total / 1000);
  return { total, days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

// Ticks once a second. The first render uses the server's clock (serverNowMs) so server and client
// HTML match exactly (no hydration mismatch); the browser clock takes over from the first tick. When it
// reaches zero it shows `ended` -- the server side flips back to paid tiers on its own (every check
// in lib/ai-free-period.ts reads the clock), this is display only.
export function AiFreePeriodCountdown({ endsAt, serverNowMs, labels }: { endsAt: string; serverNowMs: number; labels: Labels }) {
  const endMs = new Date(endsAt).getTime();
  const [now, setNow] = useState(serverNowMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const r = remaining(endMs, now);

  if (r.total === 0) return <p className="text-sm font-medium">{labels.ended}</p>;

  const units = [
    { value: r.days, label: labels.days },
    { value: r.hours, label: labels.hours },
    { value: r.minutes, label: labels.minutes },
    { value: r.seconds, label: labels.seconds },
  ];
  return (
    // role="timer" is announced only on request (implicit aria-live="off"), so screen readers
    // aren't interrupted every second; the visible units read as "160 days 4 hours ...".
    <div role="timer" className="flex gap-2 tabular-nums">
      {units.map((u, i) => (
        <div key={i} className="flex min-w-14 flex-col items-center rounded-xl bg-white/10 px-2.5 py-2 text-white ring-1 ring-white/15 backdrop-blur-sm">
          <span className="text-xl leading-none font-extrabold tracking-tight sm:text-2xl">{String(u.value).padStart(i === 0 ? 1 : 2, "0")}</span>
          <span className="mt-1 text-[11px] font-medium uppercase opacity-75">{u.label}</span>
        </div>
      ))}
    </div>
  );
}
