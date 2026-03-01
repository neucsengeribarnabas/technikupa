"use client"

import Link from "next/link"
import type { Match, Team } from "@/lib/types"
import { TeamBadge } from "@/components/team-badge"
import { cn } from "@/lib/utils"

interface MatchCardProps {
  match: Match
  teams: Team[]
  tournamentId: string
  compact?: boolean
  className?: string
}

export function MatchCard({ match, teams, tournamentId, compact, className }: MatchCardProps) {
  const homeTeam = teams.find((t) => t.id === match.homeTeamId)
  const awayTeam = teams.find((t) => t.id === match.awayTeamId)
  const groups = new Map<string, string>()
  teams.forEach((t) => {
    const group = t.groupId
    if (group) {
      const label = group.replace("group-", "").toUpperCase()
      groups.set(t.id, label)
    }
  })

  const isCompleted = match.status === "completed"
  const homeWon = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore
  const awayWon = isCompleted && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore

  return (
    <Link
      href={`/tournament/${tournamentId}/match/${match.id}`}
      className={cn(
        "block rounded-lg border bg-card p-3 transition-colors hover:bg-secondary/50",
        !isCompleted && "opacity-60",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Home team */}
        <div className={cn("flex flex-1 items-center gap-2", compact && "gap-1.5")}>
          {homeTeam ? (
            <>
              <TeamBadge
                abbreviation={homeTeam.abbreviation}
                groupLabel={groups.get(homeTeam.id)}
                size={compact ? "sm" : "md"}
                logoUrl={homeTeam.logoUrl}
              />
              {!compact && (
                <span className={cn("text-sm font-medium", homeWon && "font-bold")}>
                  {homeTeam.name}
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">TBD</span>
          )}
        </div>

        {/* Score */}
        <div className="flex items-center gap-1.5 rounded bg-secondary px-2.5 py-1 font-mono text-sm font-bold">
          <span className={cn(homeWon && "text-accent")}>{match.homeScore ?? "-"}</span>
          <span className="text-muted-foreground">:</span>
          <span className={cn(awayWon && "text-accent")}>{match.awayScore ?? "-"}</span>
        </div>

        {/* Away team */}
        <div className={cn("flex flex-1 items-center justify-end gap-2", compact && "gap-1.5")}>
          {awayTeam ? (
            <>
              {!compact && (
                <span className={cn("text-sm font-medium", awayWon && "font-bold")}>
                  {awayTeam.name}
                </span>
              )}
              <TeamBadge
                abbreviation={awayTeam.abbreviation}
                groupLabel={groups.get(awayTeam.id)}
                size={compact ? "sm" : "md"}
                logoUrl={awayTeam.logoUrl}
              />
            </>
          ) : (
            <span className="text-sm text-muted-foreground">TBD</span>
          )}
        </div>
      </div>
      {!compact && (
        <div className="mt-1.5 flex flex-col items-center gap-0.5">
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              isCompleted ? "text-muted-foreground" : "text-primary",
            )}
          >
            {match.status === "completed" ? "Full Time" : match.status === "in_progress" ? "Live" : "Scheduled"}
          </span>
          {(match.matchDate || match.matchTime || match.field) && (
            <span className="text-[10px] text-muted-foreground">
              {[match.matchDate, match.matchTime, match.field].filter(Boolean).join(" / ")}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
