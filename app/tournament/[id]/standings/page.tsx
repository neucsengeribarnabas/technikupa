"use client"

import { use } from "react"
import { useTournament } from "@/lib/tournament-context"
import { FinalStandings } from "@/components/final-standings"

export default function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { tournament } = useTournament()

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">Végeredmény</h1>
      <p className="text-sm text-muted-foreground">
        A végső helyezéseket az ágrajz eredményei határozzák meg. Játszd le az összes kieséses mérkőzést a teljes 1-16. helyezés megtekintéséhez.
      </p>
      <FinalStandings tournament={tournament} />
    </div>
  )
}
