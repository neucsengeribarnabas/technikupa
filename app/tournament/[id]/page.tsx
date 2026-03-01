"use client"

import { use } from "react"
import { useTournament } from "@/lib/tournament-context"
import { MatchCard } from "@/components/match-card"

export default function TournamentMatchesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  const recentMatches = [...tournament.matches]
    .filter((m) => m.status === "completed")
    .slice(-6)

  const upcomingMatches = tournament.matches
    .filter((m) => m.status === "scheduled")
    .slice(0, 6)

  const liveMatches = tournament.matches
    .filter((m) => m.status === "in_progress")

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Matches</h1>

      {/* Live matches */}
      {liveMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Live</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {liveMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={tournament.teams}
                tournamentId={tournament.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent results */}
      {recentMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Recent Results</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {recentMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={tournament.teams}
                tournamentId={tournament.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming matches */}
      {upcomingMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Upcoming Matches</h2>
          <div className="grid gap-2 md:grid-cols-2">
            {upcomingMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                teams={tournament.teams}
                tournamentId={tournament.id}
              />
            ))}
          </div>
        </div>
      )}

      {tournament.matches.length === 0 && (
        <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
          No matches yet. Check back later!
        </div>
      )}
    </div>
  )
}
