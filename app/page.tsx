"use client"

import Link from "next/link"
import { useTournament } from "@/lib/tournament-context"
import { GroupTable } from "@/components/group-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MatchCard } from "@/components/match-card"
import { Trophy, Users, Swords, ArrowRight, Calendar } from "lucide-react"

export default function HomePage() {
  const { tournament: t } = useTournament()

  const totalMatches = t.matches.length
  const completedMatches = t.matches.filter((m) => m.status === "completed").length
  const groupMatches = t.matches.filter((m) => m.stage === "group")
  const bracketMatches = t.matches.filter((m) => m.stage === "main" || m.stage === "consolation")

  // Next matches: scheduled matches with known teams
  const nextMatches = t.matches
    .filter((m) => m.status === "scheduled" && m.homeTeamId && m.awayTeamId)
    .slice(0, 6)

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Hero */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance md:text-4xl">
          {t.name}
        </h1>
        {t.description && (
          <p className="max-w-2xl text-muted-foreground">{t.description}</p>
        )}
        {t.status === "draft" && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
            <p className="text-sm text-foreground">
              A tornád <span className="font-semibold">Vázlat</span> módban van. Menj az{" "}
              <Link href="/admin" className="text-primary underline underline-offset-2 hover:text-primary/80">
                Admin Panelre
              </Link>{" "}
              a csapatok átnevezéséhez, majd generáld le a csoportmérkőzéseket a kezdéshez.
            </p>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Users className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{t.teams.length}</p>
              <p className="text-xs text-muted-foreground">Csapat</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Swords className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{t.groups.length}</p>
              <p className="text-xs text-muted-foreground">Csoport</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{completedMatches}/{totalMatches}</p>
              <p className="text-xs text-muted-foreground">Lejátszott meccs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">
                {t.status === "group_stage" ? "CS" : t.status === "bracket_stage" ? "KI" : t.status === "completed" ? "VG" : "VZ"}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold capitalize">
                {t.status === "group_stage" ? "Csoportkör" : t.status === "bracket_stage" ? "Kieséses" : t.status === "completed" ? "Befejezett" : "Vázlat"}
              </p>
              <p className="text-xs text-muted-foreground">Szakasz</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`/tournament/${t.id}/groups`}>
          <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-sm">
                Csoport állás
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {groupMatches.filter((m) => m.status === "completed").length}/{groupMatches.length} csoportmeccs lejátszva
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/tournament/${t.id}/bracket`}>
          <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-sm">
                Ágrajz
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {bracketMatches.filter((m) => m.status === "completed").length}/{bracketMatches.length} kieséses meccs lejátszva
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/tournament/${t.id}/standings`}>
          <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-sm">
                Végeredmény
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {t.status === "completed" ? "Végeredmény megtekintése" : "Folyamatban"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Group tables preview */}
      {groupMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Tabella</h2>
            <Link href={`/tournament/${t.id}/groups`} className="text-sm text-primary hover:underline">
              Összes megtekintése
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {t.groups.map((group) => (
              <GroupTable
                key={group.id}
                group={group}
                teams={t.teams}
                matches={t.matches}
                tournamentId={t.id}
                compact
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
