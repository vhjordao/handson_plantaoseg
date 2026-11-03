import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon: LucideIcon;
  title: React.ReactNode;
  /** A ação que a pessoa pode tomar agora. Estado vazio convida a agir. */
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icone,
  title,
  action,
  className,
  children,
  ...props
}: EmptyStateProps) {
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-3 rounded-cartao border border-divisor bg-papel p-6",
        className,
      )}
      {...props}
    >
      <Icone aria-hidden="true" className="size-7 text-tinta-suave" />
      <h2 className="font-serif text-xl font-semibold">{title}</h2>
      {children ? <div className="max-w-[60ch] text-tinta-suave">{children}</div> : null}
      {action}
    </div>
  );
}
