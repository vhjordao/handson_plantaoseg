"use client";

import * as React from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn("flex w-fit max-w-full gap-1 overflow-x-auto rounded-campo border border-divisor bg-recuo p-1", className)}
      {...props}
    />
  );
}

/** A aba ativa muda de fundo e de sombra, não só de cor: vira um bloco de papel elevado. */
export function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "inline-flex min-h-[var(--alvo-min)] items-center rounded-[8px] border border-transparent px-3.5 py-2 text-base font-semibold whitespace-nowrap text-tinta-suave transition-[background-color,color,box-shadow] duration-150 hover:text-tinta data-[state=active]:border-divisor data-[state=active]:bg-papel data-[state=active]:text-acento-forte data-[state=active]:shadow-cartao",
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
