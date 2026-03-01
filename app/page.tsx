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
              Your tournament is in <span className="font-semibold">Draft</span> mode. Head to the{" "}
              <Link href="/admin" className="text-primary underline underline-offset-2 hover:text-primary/80">
                Admin Panel
              </Link>{" "}
              to rename your teams, then generate group matches to begin.
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
              <p className="text-xs text-muted-foreground">Teams</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Swords className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{t.groups.length}</p>
              <p className="text-xs text-muted-foreground">Groups</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-8 w-8 text-primary" />
            <div>
              <p className="text-2xl font-bold">{completedMatches}/{totalMatches}</p>
              <p className="text-xs text-muted-foreground">Matches Played</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <span className="text-sm font-bold text-primary">
                {t.status === "group_stage" ? "GS" : t.status === "bracket_stage" ? "KO" : t.status === "completed" ? "FT" : "DR"}
              </span>
            </div>
            <div>
              <p className="text-sm font-bold capitalize">{t.status.replace("_", " ")}</p>
              <p className="text-xs text-muted-foreground">Stage</p>
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
                Group Standings
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {groupMatches.filter((m) => m.status === "completed").length}/{groupMatches.length} group matches completed
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/tournament/${t.id}/bracket`}>
          <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-sm">
                Brackets
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {bracketMatches.filter((m) => m.status === "completed").length}/{bracketMatches.length} bracket matches completed
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href={`/tournament/${t.id}/standings`}>
          <Card className="cursor-pointer transition-colors hover:bg-secondary/50">
            <CardHeader className="p-4">
              <CardTitle className="flex items-center justify-between text-sm">
                Final Placements
                <ArrowRight className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-xs text-muted-foreground">
                {t.status === "completed" ? "View final results" : "In progress"}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Group tables preview */}
      {groupMatches.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Group Standings</h2>
            <Link href={`/tournament/${t.id}/groups`} className="text-sm text-primary hover:underline">
              View all
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
                linkToGroup
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
