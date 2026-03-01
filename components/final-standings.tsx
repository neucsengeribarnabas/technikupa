"use client"

import type { Tournament, Team } from "@/lib/types"
import { calculateGroupStandings, type Placement, calculateFinalPlacements } from "@/lib/tournament-engine"
import { TeamBadge } from "@/components/team-badge"
import { Trophy, Medal } from "lucide-react"
import { cn } from "@/lib/utils"

interface FinalStandingsProps {
  tournament: Tournament
}

export function FinalStandings({ tournament }: FinalStandingsProps) {
  const allStandings = new Map<string, ReturnType<typeof calculateGroupStandings>>()
  tournament.groups.forEach((group) => {
    allStandings.set(
      group.id,
      calculateGroupStandings(group, tournament.teams, tournament.matches),
    )
  })

  const placements = calculateFinalPlacements(tournament, allStandings)

  if (placements.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Complete the bracket matches to see final standings.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {placements.map((p) => (
        <div
          key={p.teamId}
          className={cn(
            "flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors",
            p.position === 1 && "border-yellow-500/30 bg-yellow-500/5",
            p.position === 2 && "border-zinc-400/30 bg-zinc-400/5",
            p.position === 3 && "border-amber-700/30 bg-amber-700/5",
          )}
        >
          {/* Position */}
          <div className="flex h-8 w-8 shrink-0 items-center justify-center">
            {p.position === 1 ? (
              <Trophy className="h-5 w-5 text-yellow-500" />
            ) : p.position <= 3 ? (
              <Medal className={cn("h-5 w-5", p.position === 2 ? "text-zinc-400" : "text-amber-700")} />
            ) : (
              <span className="font-mono text-sm font-bold text-muted-foreground">
                {p.position}
              </span>
            )}
          </div>

          {/* Team */}
          <div className="flex flex-1 items-center gap-3">
            <TeamBadge
              abbreviation={p.team.abbreviation}
              groupLabel={p.team.groupId?.replace("group-", "").toUpperCase()}
              size="md"
              logoUrl={p.team.logoUrl}
            />
            <div>
              <span className="font-medium">{p.team.name}</span>
              <p className="text-xs text-muted-foreground">{p.source}</p>
            </div>
          </div>

          {/* Ordinal */}
          <span className="text-sm font-medium text-muted-foreground">
            {getOrdinal(p.position)}
          </span>
        </div>
      ))}
    </div>
  )
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
