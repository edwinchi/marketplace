"use client";

import { Check, Circle } from "lucide-react";
import { PASSWORD_RULES } from "@/lib/password-rules";
import { cn } from "@/lib/utils";

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <ul className="flex flex-col gap-1 text-sm">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li key={rule.key} className={cn("flex items-center gap-1.5", met ? "text-green-600 dark:text-green-500" : "text-muted-foreground")}>
            {met ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
