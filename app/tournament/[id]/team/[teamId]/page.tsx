"use client"

import { use } from "react"
import Link from "next/link"
import { useTournament } from "@/lib/tournament-context"
import { calculateGroupStandings, getMatchesForTeam } from "@/lib/tournament-engine"
import { TeamBadge } from "@/components/team-badge"
import { MatchCard } from "@/components/match-card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string; teamId: string }>
}) {
  const { id, teamId } = use(params)
  const { tournament } = useTournament()
  const team = tournament.teams.find((t) => t.id === teamId)

  if (!team) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Team not found.</p>
      </div>
    )
  }

  const group = tournament.groups.find((g) => g.id === team.groupId)
  const groupLabel = group?.label ?? ""
  const teamMatches = getMatchesForTeam(tournament.matches, teamId)
  const groupMatches = teamMatches.filter((m) => m.stage === "group")
  const bracketMatches = teamMatches.filter((m) => m.stage !== "group")

  // Team stats
  let wins = 0, draws = 0, losses = 0, goalsFor = 0, goalsAgainst = 0
  teamMatches.forEach((m) => {
    if (m.status !== "completed" || m.homeScore == null || m.awayScore == null) return
    const isHome = m.homeTeamId === teamId
    const scored = isHome ? m.homeScore : m.awayScore
    const conceded = isHome ? m.awayScore : m.homeScore
    goalsFor += scored
    goalsAgainst += conceded
    if (scored > conceded) wins++
    else if (scored < conceded) losses++
    else draws++
  })

  // Group standing
  let groupPosition = 0
  if (group) {
    const standings = calculateGroupStandings(group, tournament.teams, tournament.matches)
    const standing = standings.find((s) => s.teamId === teamId)
    groupPosition = standing?.rank ?? 0
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <Link href={`/tournament/${id}/groups`}>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Groups
        </Button>
      </Link>

      {/* Team header */}
      <div className="flex items-center gap-4">
        <TeamBadge abbreviation={team.abbreviation} groupLabel={groupLabel} size="lg" logoUrl={team.logoUrl} stacked />
        <div>
          <h1 className="text-2xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">
            {group?.name} {groupPosition > 0 && ` - ${getOrdinal(groupPosition)} Place`}
          </p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {[
          { label: "Played", value: wins + draws + losses },
          { label: "Won", value: wins },
          { label: "Drawn", value: draws },
          { label: "Lost", value: losses },
          { label: "GF", value: goalsFor },
          { label: "GA", value: goalsAgainst },
        ].map((stat) => (
          <div key={stat.label} className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Group stage matches */}
      {groupMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Group Stage</h2>
          <div className="space-y-2">
            {groupMatches.map((match) => (
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

      {/* Bracket matches */}
      {bracketMatches.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Knockout Stage</h2>
          <div className="space-y-2">
            {bracketMatches.map((match) => (
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
    </div>
  )
}

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"]
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}
