"use client"

import { use } from "react"
import Link from "next/link"
import { useTournament } from "@/lib/tournament-context"
import { TeamBadge } from "@/components/team-badge"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Calendar, Clock, MapPin, MessageSquare } from "lucide-react"
import { cn } from "@/lib/utils"

export default function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string; matchId: string }>
}) {
  const { id, matchId } = use(params)
  const { tournament } = useTournament()
  const match = tournament.matches.find((m) => m.id === matchId)

  if (!match) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Mérkőzés nem található.</p>
      </div>
    )
  }

  const homeTeam = tournament.teams.find((t) => t.id === match.homeTeamId)
  const awayTeam = tournament.teams.find((t) => t.id === match.awayTeamId)
  const isCompleted = match.status === "completed"
  const homeWon = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore > match.awayScore
  const awayWon = isCompleted && match.homeScore != null && match.awayScore != null && match.awayScore > match.homeScore
  const isDraw = isCompleted && match.homeScore != null && match.awayScore != null && match.homeScore === match.awayScore

  const stageLabel =
    match.stage === "group"
      ? `Csoportkör${match.groupId ? ` - ${tournament.groups.find((g) => g.id === match.groupId)?.name}` : ""}`
      : match.stage === "main"
        ? "Főág"
        : "Vigaszág"

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <Link href={match.stage === "group" ? `/tournament/${id}/groups` : `/tournament/${id}/bracket`}>
        <Button variant="ghost" size="sm" className="text-muted-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {match.stage === "group" ? "Vissza a csoportokhoz" : "Vissza az ágrajzhoz"}
        </Button>
      </Link>

      {/* Stage label + match info */}
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {stageLabel}
          {match.matchday && ` / ${match.matchday}. Játéknap`}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {match.matchDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {match.matchDate}
            </span>
          )}
          {match.matchTime && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {match.matchTime}
            </span>
          )}
          {match.field && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {match.field}
            </span>
          )}
        </div>
      </div>

      {/* Match score card */}
      <div className="rounded-xl border bg-card p-6">
        <div className="flex items-center justify-between gap-4">
          {/* Home team */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            {homeTeam ? (
              <>
                <TeamBadge
                  abbreviation={homeTeam.abbreviation}
                  groupLabel={homeTeam.groupId.replace("group-", "").toUpperCase()}
                  size="lg"
                  logoUrl={homeTeam.logoUrl}
                />
                <Link
                  href={`/tournament/${id}/team/${homeTeam.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {homeTeam.name}
                </Link>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">TBD</span>
            )}
          </div>

          {/* Score */}
          <div className="flex flex-col items-center gap-1">
            <div className="flex items-center gap-3 rounded-lg bg-secondary px-5 py-3 font-mono text-3xl font-bold">
              <span className={cn(homeWon && "text-accent")}>
                {match.homeScore ?? "-"}
              </span>
              <span className="text-lg text-muted-foreground">:</span>
              <span className={cn(awayWon && "text-accent")}>
                {match.awayScore ?? "-"}
              </span>
            </div>
            <span
              className={cn(
                "text-[10px] font-medium uppercase tracking-widest",
                isCompleted ? "text-muted-foreground" : "text-primary",
              )}
            >
              {match.status === "completed"
                ? "Vége"
                : match.status === "in_progress"
                  ? "Élő"
                  : "Tervezett"}
            </span>
          </div>

          {/* Away team */}
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            {awayTeam ? (
              <>
                <TeamBadge
                  abbreviation={awayTeam.abbreviation}
                  groupLabel={awayTeam.groupId.replace("group-", "").toUpperCase()}
                  size="lg"
                  logoUrl={awayTeam.logoUrl}
                />
                <Link
                  href={`/tournament/${id}/team/${awayTeam.id}`}
                  className="text-sm font-semibold hover:underline"
                >
                  {awayTeam.name}
                </Link>
              </>
            ) : (
              <span className="text-sm text-muted-foreground">TBD</span>
            )}
          </div>
        </div>
      </div>

      {/* Match stats */}
      {isCompleted && (
        <div className="space-y-3 rounded-lg border bg-card p-4">
          <h3 className="text-sm font-semibold">Mérkőzés részletei</h3>
          <div className="space-y-2">
            {[
              { label: "Sárga lap 🟨", home: match.homeYellowCards ?? 0, away: match.awayYellowCards ?? 0 },
              { label: "Piros lap 🟥", home: match.homeRedCards ?? 0, away: match.awayRedCards ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-sm">
                <span className="font-mono">{stat.home}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
                <span className="font-mono">{stat.away}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comment */}
      {match.comment && (
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-start gap-2">
            <MessageSquare className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm text-muted-foreground">{match.comment}</p>
          </div>
        </div>
      )}
    </div>
  )
}
