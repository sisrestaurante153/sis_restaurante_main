import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[1.25rem] border border-border/90 bg-card p-5 shadow-[0_24px_60px_-44px_rgba(15,23,42,0.35)] sm:p-6",
        className
      )}
      {...props}
    />
  );
}
