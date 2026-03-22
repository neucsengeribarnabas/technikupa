"use client"

import { use } from "react"
import { useTournament } from "@/lib/tournament-context"
import { BracketView, BracketMatchList } from "@/components/bracket-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Kieséses szakasz</h1>

      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">Főág</TabsTrigger>
          <TabsTrigger value="consolation">Vigaszág</TabsTrigger>
          <TabsTrigger value="matches">Meccsek</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="pt-4">
          <BracketView
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
            stage="main"
            title="Főág"
            groups={tournament.groups}
          />
        </TabsContent>

        <TabsContent value="consolation" className="pt-4">
          <BracketView
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
            stage="consolation"
            title="Vigaszág"
            groups={tournament.groups}
          />
        </TabsContent>

        <TabsContent value="matches" className="pt-4">
          <BracketMatchList
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
