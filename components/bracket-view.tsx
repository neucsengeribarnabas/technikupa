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

// Hungarian translations for round labels
function getHungarianRoundLabel(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - 1 - round
  switch (roundsFromEnd) {
    case 0: return "Döntő"
    case 1: return "Elődöntő"
    case 2: return "Negyeddöntő"
    case 3: return "Nyolcaddöntő"
    default: return `${round + 1}. Forduló`
  }
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
        Még nincsenek kieséses mérkőzések. 
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

      {/* Desktop bracket view with curly brace connectors */}
      <div className="hidden overflow-x-auto md:block">
        <div 
          className="inline-flex items-start gap-4 pb-4" 
          style={{ minWidth: `${totalRounds * 240}px` }}
        >
          {Array.from(rounds.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatches], roundIndex) => {
              const label = getHungarianRoundLabel(round, totalRounds)
              // Spacing increases with each round to align vertically
              const gapMultiplier = Math.pow(2, round)
              const isFirstRound = round === 0
              const isLastRound = roundIndex === rounds.size - 1

              return (
                <div key={round} className="flex flex-col items-center">
                  <span className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                  <div
                    className="flex flex-col justify-around"
                    style={{
                      gap: `${gapMultiplier * 2.5}rem`,
                      paddingTop: `${(gapMultiplier - 1) * 1.75}rem`,
                    }}
                  >
                    {roundMatches.map((match, matchIndex) => (
                      <div key={match.id} className="relative flex items-center">
                        {/* Curly brace connector from previous round (left side) */}
                        {!isFirstRound && (
                          <div className="absolute -left-4 top-1/2 -translate-y-1/2">
                            <svg 
                              width="16" 
                              height="24" 
                              viewBox="0 0 16 24" 
                              className="text-border"
                            >
                              <path
                                d="M16 12 L8 12 C4 12 4 12 4 6 L4 0 M4 24 L4 18 C4 12 4 12 8 12"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                              />
                            </svg>
                          </div>
                        )}
                        
                        <BracketMatchCard
                          match={match}
                          teams={teams}
                          tournamentId={tournamentId}
                        />
                        
                        {/* Curly brace connector to next round (right side) */}
                        {match.nextMatchId && !isLastRound && (
                          <div className="absolute -right-4 top-1/2 -translate-y-1/2">
                            {matchIndex % 2 === 0 ? (
                              // Top match of pair - curly brace going down
                              <svg 
                                width="16" 
                                height="60" 
                                viewBox="0 0 16 60" 
                                className="text-border"
                                style={{ transform: 'translateY(25%)' }}
                              >
                                <path
                                  d="M0 12 L8 12 C12 12 12 20 12 30 L12 30"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            ) : (
                              // Bottom match of pair - curly brace going up
                              <svg 
                                width="16" 
                                height="60" 
                                viewBox="0 0 16 60" 
                                className="text-border"
                                style={{ transform: 'translateY(-75%)' }}
                              >
                                <path
                                  d="M0 48 L8 48 C12 48 12 40 12 30 L12 30"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                />
                              </svg>
                            )}
                          </div>
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
            const label = getHungarianRoundLabel(round, totalRounds)
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
            {stage === "main" ? "Bronzmérkőzés" : "11. helyért"}
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
