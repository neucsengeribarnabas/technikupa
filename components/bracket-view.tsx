"use client"

import type { Match, Team, MatchStage } from "@/lib/types"
import { getRoundLabel } from "@/lib/tournament-engine"
import { BracketMatchCard } from "@/components/bracket-match-card"
import { cn } from "@/lib/utils"

interface BracketViewProps {
  matches: Match[]
  teams: Team[]
  tournamentId: string
  stage: MatchStage
  title: string
}

export function BracketView({ matches, teams, tournamentId, stage, title }: BracketViewProps) {
  const bracketMatches = matches
    .filter((m) => m.stage === stage && !m.id.includes("3rd"))
    .sort((a, b) => {
      if ((a.bracketRound ?? 0) !== (b.bracketRound ?? 0))
        return (a.bracketRound ?? 0) - (b.bracketRound ?? 0)
      return (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
    })

  const thirdPlaceMatch = matches.find((m) => m.stage === stage && m.id.includes("3rd"))

  if (bracketMatches.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        No bracket matches yet. Complete the group stage first.
      </div>
    )
  }

  // Group matches by round
  const rounds = new Map<number, Match[]>()
  bracketMatches.forEach((m) => {
    const round = m.bracketRound ?? 0
    if (!rounds.has(round)) rounds.set(round, [])
    rounds.get(round)!.push(m)
  })

  const totalRounds = Math.max(...Array.from(rounds.keys())) + 1

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">{title}</h3>

      {/* Desktop bracket view */}
      <div className="hidden overflow-x-auto md:block">
        <div className="flex items-start gap-8 pb-4" style={{ minWidth: `${totalRounds * 220}px` }}>
          {Array.from(rounds.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatches]) => {
              const label = getRoundLabel(round, totalRounds)
              // Spacing increases with each round to align vertically
              const gapMultiplier = Math.pow(2, round)

              return (
                <div key={round} className="flex flex-col items-center gap-2">
                  <span className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <div
                    className="flex flex-col justify-around"
                    style={{
                      gap: `${gapMultiplier * 2}rem`,
                      paddingTop: `${(gapMultiplier - 1) * 1.5}rem`,
                    }}
                  >
                    {roundMatches.map((match) => (
                      <div key={match.id} className="relative">
                        <BracketMatchCard
                          match={match}
                          teams={teams}
                          tournamentId={tournamentId}
                        />
                        {/* Connector line to next round */}
                        {match.nextMatchId && (
                          <div
                            className="absolute right-0 top-1/2 h-px w-8 -translate-y-1/2 bg-border"
                            style={{ left: "100%" }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* Mobile list view */}
      <div className="space-y-4 md:hidden">
        {Array.from(rounds.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, roundMatches]) => {
            const label = getRoundLabel(round, totalRounds)
            return (
              <div key={round} className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {label}
                </span>
                <div className="space-y-2">
                  {roundMatches.map((match) => (
                    <BracketMatchCard
                      key={match.id}
                      match={match}
                      teams={teams}
                      tournamentId={tournamentId}
                      className="w-full"
                    />
                  ))}
                </div>
              </div>
            )
          })}
      </div>

      {/* 3rd place match */}
      {thirdPlaceMatch && (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {stage === "main" ? "3rd Place Match" : "11th Place Match"}
          </span>
          <BracketMatchCard
            match={thirdPlaceMatch}
            teams={teams}
            tournamentId={tournamentId}
            className={cn("md:w-48")}
          />
        </div>
      )}
    </div>
  )
}
