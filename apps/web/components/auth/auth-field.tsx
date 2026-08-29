import type { ComponentProps } from "react";
import type { LucideIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function AuthField({
  icon: Icon,
  label,
  id,
  className,
  ...props
}: { icon: LucideIcon; label: string; id: string } & ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input id={id} className={cn("h-10 pl-9", className)} {...props} />
      </div>
    </div>
  );
}
