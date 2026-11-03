"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex gap-1 overflow-x-auto pb-1", className)}
      {...props}
    />
  );
}

/** A aba ativa muda de borda e de fundo, não só de cor. */
export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-[var(--alvo-min)] items-center rounded-campo border border-transparent px-3 py-2 text-base font-semibold whitespace-nowrap text-tinta-suave hover:text-tinta data-[state=active]:border-tinta data-[state=active]:bg-papel data-[state=active]:text-tinta",
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn("mt-4", className)} {...props} />;
}
