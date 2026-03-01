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
  logoUrl?: string
  /** When true, shows logo stacked above abbreviation */
  stacked?: boolean
}

export function TeamBadge({ abbreviation, groupLabel, size = "md", className, logoUrl, stacked }: TeamBadgeProps) {
  const colors = groupLabel ? groupColorMap[groupLabel] : null
  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px]",
    md: "px-2 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }
  const imgSizes = { sm: 20, md: 28, lg: 40 }
  const stackedImgSizes = { sm: 24, md: 32, lg: 48 }

  if (logoUrl && stacked) {
    return (
      <span className={cn("inline-flex flex-col items-center gap-0.5 rounded font-mono font-bold tracking-wider", sizeClasses[size], colors ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-secondary text-secondary-foreground", className)}>
        <img src={logoUrl} alt={`${abbreviation} logo`} width={stackedImgSizes[size]} height={stackedImgSizes[size]} className="rounded object-contain" />
        {abbreviation}
      </span>
    )
  }

  if (logoUrl) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 rounded font-mono font-bold tracking-wider", sizeClasses[size], colors ? `${colors.bg} ${colors.text} border ${colors.border}` : "bg-secondary text-secondary-foreground", className)}>
        <img src={logoUrl} alt={`${abbreviation} logo`} width={imgSizes[size]} height={imgSizes[size]} className="rounded object-contain" />
        {abbreviation}
      </span>
    )
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
