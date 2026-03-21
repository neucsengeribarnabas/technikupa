"use client"

import Link from "next/link"
import type { Match, Team, Group } from "@/lib/types"
import { cn } from "@/lib/utils"

// Group color map for colored abbreviations
const groupColorMap: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-group-a-bg", text: "text-group-a", border: "border-group-a/30" },
  B: { bg: "bg-group-b-bg", text: "text-group-b", border: "border-group-b/30" },
  C: { bg: "bg-group-c-bg", text: "text-group-c", border: "border-group-c/30" },
  D: { bg: "bg-group-d-bg", text: "text-group-d", border: "border-group-d/30" },
}

type CardVariant = "default" | "final" | "bronze" | "losers" | "placement"

interface BracketMatchCardProps {
  match: Match
  teams: Team[]
  tournamentId: string
  className?: string
  showColoredAbbr?: boolean
  groups?: Group[]
  variant?: CardVariant
}

function getGroupLabel(team: Team, groups?: Group[]): string | undefined {
  if (!groups) return undefined
  const group = groups.find((g) => g.id === team.groupId)
  return group?.label
}

function ColoredAbbreviation({ team, groups }: { team: Team; groups?: Group[] }) {
  const groupLabel = getGroupLabel(team, groups)
  const colors = groupLabel ? groupColorMap[groupLabel] : null

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider",
        colors 
          ? `${colors.bg} ${colors.text} border ${colors.border}` 
          : "bg-secondary text-secondary-foreground"
      )}
    >
      {team.abbreviation}
    </span>
  )
}

export function BracketMatchCard({ 
  match, 
  teams, 
  tournamentId, 
  className,
  showColoredAbbr = false,
  groups,
  variant = "default"
}: BracketMatchCardProps) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId)
  const awayTeam = teams.find((t) => t.id === match.awayTeamId)
  const isCompleted = match.status === "completed"
  const homeWon = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore
  const awayWon = isCompleted && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore

  // Variant-based styling
  const variantStyles: Record<CardVariant, string> = {
    default: "",
    final: "border-amber-500/50 ring-2 ring-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20",
    bronze: "border-orange-400/50 ring-1 ring-orange-400/30 bg-orange-50/30 dark:bg-orange-950/20",
    losers: "border-red-300/40 bg-red-50/20 dark:bg-red-950/10",
    placement: "border-blue-300/40 bg-blue-50/20 dark:bg-blue-950/10",
  }

  return (
    <Link
      href={`/tournament/${tournamentId}/match/${match.id}`}
      className={cn(
        "block w-44 rounded-lg border bg-card transition-colors hover:border-primary/50 hover:shadow-md",
        variantStyles[variant],
        !isCompleted && "opacity-70",
        className,
      )}
    >
      {/* Home team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2 py-1.5",
          homeWon && "bg-accent/15",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {homeTeam ? (
            <>
              {showColoredAbbr ? (
                <ColoredAbbreviation team={homeTeam} groups={groups} />
              ) : (
                <span className="inline-flex items-center justify-center rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-secondary-foreground">
                  {homeTeam.abbreviation}
                </span>
              )}
              <span className={cn("truncate text-xs", homeWon ? "font-bold" : "font-medium")}>
                {homeTeam.name}
              </span>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">TBD</span>
          )}
        </div>
        <span className={cn("min-w-[1.25rem] text-right font-mono text-xs font-bold", homeWon && "text-accent")}>
          {match.homeScore ?? "-"}
        </span>
      </div>

      {/* Away team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-2 py-1.5",
          awayWon && "bg-accent/15",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {awayTeam ? (
            <>
              {showColoredAbbr ? (
                <ColoredAbbreviation team={awayTeam} groups={groups} />
              ) : (
                <span className="inline-flex items-center justify-center rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider text-secondary-foreground">
                  {awayTeam.abbreviation}
                </span>
              )}
              <span className={cn("truncate text-xs", awayWon ? "font-bold" : "font-medium")}>
                {awayTeam.name}
              </span>
            </>
          ) : (
            <span className="text-xs italic text-muted-foreground">TBD</span>
          )}
        </div>
        <span className={cn("min-w-[1.25rem] text-right font-mono text-xs font-bold", awayWon && "text-accent")}>
          {match.awayScore ?? "-"}
        </span>
      </div>
    </Link>
  )
}
