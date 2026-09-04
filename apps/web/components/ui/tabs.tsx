"use client"

import * as React from "react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex gap-4 border-b", className)}
      {...props}
    />
  )
}

// Base UI renders `data-active` (no value) on the selected Tab -- verified against
// node_modules/@base-ui/react/internals/getStateAttributesProps.js, not guessed.
function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "-mb-px border-b-2 border-transparent px-1 pb-2 text-sm font-medium text-muted-foreground transition-colors data-[active]:border-[#008200] data-[active]:text-[#046637]",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel data-slot="tabs-content" className={cn("pt-3", className)} {...props} />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
