"use client"

import { use } from "react"
import { useTournament } from "@/lib/tournament-context"
import { GroupTable } from "@/components/group-table"
import { MatchCard } from "@/components/match-card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function GroupsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Csoportkör</h1>

      <Tabs defaultValue="standings">
        <TabsList>
          <TabsTrigger value="standings">Tabella</TabsTrigger>
          <TabsTrigger value="matches">Mérkőzések</TabsTrigger>
        </TabsList>

        <TabsContent value="standings" className="space-y-4 pt-4">
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

        <TabsContent value="matches" className="space-y-6 pt-4">
          {tournament.groups.map((group) => {
            const groupMatches = tournament.matches.filter(
              (m) => m.stage === "group" && m.groupId === group.id,
            )
            // Group by matchday
            const matchdays = new Map<number, typeof groupMatches>()
            groupMatches.forEach((m) => {
              const md = m.matchday ?? 1
              if (!matchdays.has(md)) matchdays.set(md, [])
              matchdays.get(md)!.push(m)
            })

            return (
              <div key={group.id} className="space-y-3">
                <h2 className="text-lg font-semibold">{group.name}</h2>
                {Array.from(matchdays.entries())
                  .sort(([a], [b]) => a - b)
                  .map(([md, matches]) => (
                    <div key={md} className="space-y-2">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        {md}. Játéknap
                      </p>
                      <div className="grid gap-2 md:grid-cols-2">
                        {matches.map((match) => (
                          <MatchCard
                            key={match.id}
                            match={match}
                            teams={tournament.teams}
                            tournamentId={tournament.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )
          })}
        </TabsContent>
      </Tabs>
    </div>
  )
}
