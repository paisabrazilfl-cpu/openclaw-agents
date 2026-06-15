import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline";

const variants: Record<Variant, string> = {
  default: "border-transparent bg-indigo-600 text-white",
  outline: "border-zinc-700 text-zinc-300",
};

export interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}
