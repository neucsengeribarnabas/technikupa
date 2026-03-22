"use client"

import Link from "next/link"
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
        A végeredmények a kieséses szakaszban fognak megjelenni.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {placements.map((p) => (
        <Link
          key={p.teamId}
          href={`/tournament/${tournament.id}/team/${p.teamId}`}
          className={cn(
            "flex items-center gap-4 rounded-lg border bg-card px-4 py-3 transition-colors hover:border-primary/50 hover:shadow-md",
            p.position === 1 && "border-yellow-500/30 bg-yellow-500/5 hover:border-yellow-500/50",
            p.position === 2 && "border-zinc-400/30 bg-zinc-400/5 hover:border-zinc-400/50",
            p.position === 3 && "border-amber-700/30 bg-amber-700/5 hover:border-amber-700/50",
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
            />
            <div>
              <span className="font-medium">{p.team.name}</span>
            </div>
          </div>

          {/* Ordinal */}
          <span className="text-sm font-medium text-muted-foreground">
            {getOrdinal(p.position)}
          </span>
        </Link>
      ))}
    </div>
  )
}

function getOrdinal(n: number): string {
  return `${n}. helyezett`
}
