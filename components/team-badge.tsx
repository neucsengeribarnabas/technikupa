"use client"

import { cn } from "@/lib/utils"

const groupColorMap: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-group-a-bg", text: "text-group-a", border: "border-group-a/30" },
  B: { bg: "bg-group-b-bg", text: "text-group-b", border: "border-group-b/30" },
  C: { bg: "bg-group-c-bg", text: "text-group-c", border: "border-group-c/30" },
  D: { bg: "bg-group-d-bg", text: "text-group-d", border: "border-group-d/30" },
}

interface TeamBadgeProps {
  abbreviation: string
  groupLabel?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function TeamBadge({ abbreviation, groupLabel, size = "md", className }: TeamBadgeProps) {
  const colors = groupLabel ? groupColorMap[groupLabel] : null
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-0.5 text-xs",
    lg: "px-3 py-1 text-sm",
  }

  return (
    <span
      className={cn(
        "inline-flex items-center rounded font-mono font-bold tracking-wider",
        sizeClasses[size],
        colors ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-secondary text-secondary-foreground",
        className,
      )}
    >
      {abbreviation}
    </span>
  )
}

export function getGroupColors(label: string) {
  return groupColorMap[label] ?? { bg: "bg-secondary", text: "text-secondary-foreground", border: "border-border" }
}
