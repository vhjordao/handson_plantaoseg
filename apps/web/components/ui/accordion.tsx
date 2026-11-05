"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;

export function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item className={cn("border-b border-divisor", className)} {...props} />;
}

export function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        className={cn(
          "group flex min-h-[var(--alvo-min)] flex-1 items-start justify-between gap-4 py-4 text-left text-lg font-semibold underline-offset-4 hover:underline",
          className,
        )}
        {...props}
      >
        <span>{children}</span>
        <ChevronDown
          aria-hidden="true"
          className="mt-1 size-5 shrink-0 transition-transform duration-150 group-data-[state=open]:rotate-180"
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

export function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content {...props}>
      <div className={cn("max-w-[68ch] pb-5 text-base text-tinta-suave", className)}>{children}</div>
    </AccordionPrimitive.Content>
  );
}
