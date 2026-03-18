"use client"

import Link from "next/link"
import type { Match, Team } from "@/lib/types"
import { TeamBadge } from "@/components/team-badge"
import { cn } from "@/lib/utils"

interface BracketMatchCardProps {
  match: Match
  teams: Team[]
  tournamentId: string
  className?: string
}

export function BracketMatchCard({ match, teams, tournamentId, className }: BracketMatchCardProps) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId)
  const awayTeam = teams.find((t) => t.id === match.awayTeamId)
  const isCompleted = match.status === "completed"
  const homeWon = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore
  const awayWon = isCompleted && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore

  return (
    <Link
      href={`/tournament/${tournamentId}/match/${match.id}`}
      className={cn(
        "block w-48 rounded-lg border bg-card transition-colors hover:border-primary/50",
        match.id.includes("final") && !match.id.includes("3rd") && "border-primary/30 ring-1 ring-primary/20",
        !isCompleted && "opacity-60",
        className,
      )}
    >
      {/* Home team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2.5 py-1.5",
          homeWon && "bg-accent/10",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {homeTeam ? (
            <>
              <TeamBadge abbreviation={homeTeam.abbreviation} size="sm" logoUrl={homeTeam.logoUrl} />
              <span className={cn("truncate text-xs", homeWon ? "font-bold" : "font-medium")}>
                {homeTeam.name}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
        <span className={cn("font-mono text-xs font-bold", homeWon && "text-accent")}>
          {match.homeScore ?? "-"}
        </span>
      </div>

      {/* Away team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-1.5",
          awayWon && "bg-accent/10",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {awayTeam ? (
            <>
              <TeamBadge abbreviation={awayTeam.abbreviation} size="sm" logoUrl={awayTeam.logoUrl} />
              <span className={cn("truncate text-xs", awayWon ? "font-bold" : "font-medium")}>
                {awayTeam.name}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
        <span className={cn("font-mono text-xs font-bold", awayWon && "text-accent")}>
          {match.awayScore ?? "-"}
        </span>
      </div>
    </Link>
  )
}
