import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps extends Omit<React.ComponentProps<"div">, "title"> {
  icon: LucideIcon;
  title: React.ReactNode;
  /** A ação que a pessoa pode tomar agora. Estado vazio convida a agir. */
  action?: React.ReactNode;
  /** O nível do título. Uma página inteira que é só o estado (404, erro) usa `h1`. */
  headingLevel?: "h1" | "h2" | "h3";
}

export function EmptyState({
  icon: Icone,
  title,
  action,
  headingLevel = "h2",
  className,
  children,
  ...props
}: EmptyStateProps) {
  const Titulo = headingLevel;
  return (
    <div
      data-slot="empty-state"
      className={cn(
        "flex flex-col items-start gap-3 superficie p-6",
        className,
      )}
      {...props}
    >
      <Icone aria-hidden="true" className="size-7 text-tinta-suave" />
      <Titulo
        className={cn("font-titulo font-semibold", headingLevel === "h1" ? "text-3xl" : "text-xl")}
      >
        {title}
      </Titulo>
      {children ? <div className="max-w-[60ch] text-tinta-suave">{children}</div> : null}
      {action}
    </div>
  );
}
