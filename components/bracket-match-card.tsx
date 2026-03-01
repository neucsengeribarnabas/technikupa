"use client"

import Link from "next/link"
import type { Match, Team } from "@/lib/types"
import { cn } from "@/lib/utils"

interface BracketMatchCardProps {
  match: Match
  teams: Team[]
  tournamentId: string
  className?: string
  label?: string
}

export function BracketMatchCard({ match, teams, tournamentId, className, label }: BracketMatchCardProps) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId)
  const awayTeam = teams.find((t) => t.id === match.awayTeamId)
  const isCompleted = match.status === "completed"
  const homeWon = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore
  const awayWon = isCompleted && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore

  return (
    <Link
      href={`/tournament/${tournamentId}/match/${match.id}`}
      className={cn(
        "block w-52 rounded-lg border bg-card transition-colors hover:border-primary/50",
        match.id.includes("final") && !match.id.includes("3rd") && "border-primary/30 ring-1 ring-primary/20",
        !isCompleted && "opacity-60",
        className,
      )}
    >
      {/* Match label */}
      {label && (
        <div className="border-b px-2.5 py-1 text-center">
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        </div>
      )}

      {/* Home team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 border-b px-2.5 py-2",
          homeWon && "bg-accent/10",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {homeTeam ? (
            <>
              {homeTeam.logoUrl && (
                <img src={homeTeam.logoUrl} alt="" width={18} height={18} className="shrink-0 rounded object-contain" />
              )}
              <span className={cn("truncate text-xs text-left", homeWon ? "font-bold" : "font-medium")}>
                {homeTeam.abbreviation}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">TBD</span>
          )}
        </div>
        <span className={cn("shrink-0 font-mono text-xs font-bold", homeWon && "text-accent")}>
          {match.homeScore ?? "-"}
        </span>
      </div>

      {/* Away team row */}
      <div
        className={cn(
          "flex items-center justify-between gap-2 px-2.5 py-2",
          awayWon && "bg-accent/10",
        )}
      >
        <div className="flex items-center gap-1.5 overflow-hidden">
          {awayTeam ? (
            <>
              {awayTeam.logoUrl && (
                <img src={awayTeam.logoUrl} alt="" width={18} height={18} className="shrink-0 rounded object-contain" />
              )}
              <span className={cn("truncate text-xs text-left", awayWon ? "font-bold" : "font-medium")}>
                {awayTeam.abbreviation}
              </span>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">TBD</span>
          )}
        </div>
        <span className={cn("shrink-0 font-mono text-xs font-bold", awayWon && "text-accent")}>
          {match.awayScore ?? "-"}
        </span>
      </div>
    </Link>
  )
}
