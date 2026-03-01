"use client"

import { use } from "react"
import Link from "next/link"
import { useTournament } from "@/lib/tournament-context"
import { GroupTable } from "@/components/group-table"
import { BracketView } from "@/components/bracket-view"
import { MatchCard } from "@/components/match-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight } from "lucide-react"

export default function TournamentOverviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  const recentMatches = [...tournament.matches]
    .filter((m) => m.status === "completed")
    .slice(-6)

  const upcomingMatches = tournament.matches
    .filter((m) => m.status === "scheduled")
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">{tournament.name}</h1>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="bracket">Bracket</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 pt-4">
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
        </TabsContent>

        <TabsContent value="groups" className="space-y-4 pt-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Group Standings</h2>
            <Link href={`/tournament/${id}/groups`} className="text-sm text-primary hover:underline">
              Full View <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {tournament.groups.map((group) => (
              <GroupTable
                key={group.id}
                group={group}
                teams={tournament.teams}
                matches={tournament.matches}
                tournamentId={tournament.id}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="bracket" className="space-y-6 pt-4">
          <BracketView
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
            stage="main"
            title="Championship Bracket"
          />
          <BracketView
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
            stage="consolation"
            title="Consolation Bracket"
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
