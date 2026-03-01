"use client"

import { use } from "react"
import { useTournament } from "@/lib/tournament-context"
import { BracketView } from "@/components/bracket-view"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Knockout Stage</h1>

      <Tabs defaultValue="main">
        <TabsList>
          <TabsTrigger value="main">Championship</TabsTrigger>
          <TabsTrigger value="consolation">Consolation</TabsTrigger>
        </TabsList>

        <TabsContent value="main" className="pt-4">
          <BracketView
            matches={tournament.matches}
            teams={tournament.teams}
            tournamentId={tournament.id}
            stage="main"
            title="Championship Bracket"
          />
        </TabsContent>

        <TabsContent value="consolation" className="pt-4">
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
