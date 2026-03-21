"use client"

import type { Match, Team, MatchStage, Group } from "@/lib/types"
import { BracketMatchCard } from "@/components/bracket-match-card"
import { cn } from "@/lib/utils"

interface BracketViewProps {
  matches: Match[]
  teams: Team[]
  tournamentId: string
  stage: MatchStage
  title: string
  groups?: Group[]
}

// Match type labels for the complex bracket
type MatchType = 
  | "qf"           // Quarter-finals (Negyeddöntő)
  | "sf"           // Semi-finals 1-4 (Elődöntő)
  | "sf58"         // Semi-finals 5-8 (5-8. helyért)
  | "final"        // Final (1st-2nd)
  | "3rd"          // 3rd place match
  | "5th"          // 5th place match
  | "7th"          // 7th place match

interface BracketMatchInfo {
  match: Match
  type: MatchType
  label: string
  position: number
}

// Hungarian translations for match labels
function getMatchLabel(type: MatchType, stage: MatchStage): string {
  const isConsolation = stage === "consolation"
  switch (type) {
    case "qf": return "Negyeddöntő"
    case "sf": return "Elődöntő (1-4)"
    case "sf58": return isConsolation ? "Elődöntő (13-16)" : "Elődöntő (5-8)"
    case "final": return "Döntő"
    case "3rd": return isConsolation ? "11. helyért" : "Bronzmérkőzés"
    case "5th": return isConsolation ? "13. helyért" : "5. helyért"
    case "7th": return isConsolation ? "15. helyért" : "7. helyért"
    default: return ""
  }
}

// Categorize matches into their bracket positions
function categorizeMatches(matches: Match[], stage: MatchStage): Map<MatchType, BracketMatchInfo[]> {
  const bracketMatches = matches.filter((m) => m.stage === stage)
  const result = new Map<MatchType, BracketMatchInfo[]>()
  
  for (const match of bracketMatches) {
    const position = match.bracketPosition ?? 0
    let type: MatchType
    
    if (match.id.includes("3rd")) {
      type = "3rd"
    } else if (match.id.includes("5th")) {
      type = "5th"
    } else if (match.id.includes("7th")) {
      type = "7th"
    } else if (match.id.includes("sf58")) {
      type = "sf58"
    } else if (match.bracketRound === 0 && position < 10) {
      type = "qf"
    } else if (match.bracketRound === 1 && position < 10) {
      type = "sf"
    } else if (match.bracketRound === 2 && position === 0) {
      type = "final"
    } else {
      // Fallback
      type = "qf"
    }
    
    const info: BracketMatchInfo = {
      match,
      type,
      label: getMatchLabel(type, stage),
      position
    }
    
    if (!result.has(type)) result.set(type, [])
    result.get(type)!.push(info)
  }
  
  // Sort each category by position
  for (const [_, infos] of result) {
    infos.sort((a, b) => a.position - b.position)
  }
  
  return result
}

export function BracketView({ matches, teams, tournamentId, stage, title, groups }: BracketViewProps) {
  const bracketMatches = matches.filter((m) => m.stage === stage)

  if (bracketMatches.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center text-muted-foreground">
        Még nincsenek kieséses mérkőzések. 
      </div>
    )
  }

  const categorized = categorizeMatches(matches, stage)
  
  const qf = categorized.get("qf") ?? []
  const sf = categorized.get("sf") ?? []
  const sf58 = categorized.get("sf58") ?? []
  const finalMatch = categorized.get("final") ?? []
  const thirdPlace = categorized.get("3rd") ?? []
  const fifthPlace = categorized.get("5th") ?? []
  const seventhPlace = categorized.get("7th") ?? []

  // Determine if we have a complex bracket with placement matches for 5-8
  const hasPlacementMatches = sf58.length > 0 || fifthPlace.length > 0 || seventhPlace.length > 0
  
  // Simple bracket (no placement matches)
  if (!hasPlacementMatches) {
    return (
      <SimpleBracketView 
        matches={matches}
        teams={teams}
        tournamentId={tournamentId}
        stage={stage}
        title={title}
        groups={groups}
      />
    )
  }
  
  const isConsolation = stage === "consolation"

  // Complex bracket with winner and placement matches (8 teams)
  // Structure: QF -> SF (1-4) + SF (5-8) -> Finals (1st, 3rd, 5th, 7th)
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold">{title}</h3>
      
      {/* Desktop complex bracket view */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[900px] pb-4">
          {/* Column Headers */}
          <div className="mb-4 grid grid-cols-5 gap-4">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Negyeddöntő
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "Elődöntő (9-12)" : "Elődöntő (1-4)"}
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "Elődöntő (13-16)" : "Elődöntő (5-8)"}
            </div>
            <div className="col-span-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Végeredmény
            </div>
          </div>

          {/* Bracket Grid */}
          <div className="relative grid grid-cols-5 gap-4">
            {/* Column 1: Quarter-finals */}
            <div className="flex flex-col justify-around gap-3">
              {qf.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                />
              ))}
            </div>

            {/* Column 2: Semi-finals (1-4) */}
            <div className="flex flex-col justify-around gap-6" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
              {sf.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                />
              ))}
            </div>

            {/* Column 3: Semi-finals (5-8) */}
            <div className="flex flex-col justify-around gap-6" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
              {sf58.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                  variant="losers"
                />
              ))}
            </div>

            {/* Column 4: Final + 3rd place */}
            <div className="flex flex-col justify-around gap-4">
              {finalMatch.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                  variant="final"
                />
              ))}
              {thirdPlace.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                  variant="bronze"
                />
              ))}
            </div>

            {/* Column 5: 5th and 7th place matches */}
            <div className="flex flex-col justify-around gap-4">
              {fifthPlace.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                  variant="placement"
                />
              ))}
              {seventhPlace.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  showColoredAbbr
                  groups={groups}
                  variant="placement"
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tablet view */}
      <div className="hidden overflow-x-auto md:block lg:hidden">
        <SimpleBracketView 
          matches={matches}
          teams={teams}
          tournamentId={tournamentId}
          stage={stage}
          title=""
          groups={groups}
        />
      </div>

      {/* Mobile list view */}
      <MobileListView 
        categorized={categorized}
        teams={teams}
        tournamentId={tournamentId}
        groups={groups}
        stage={stage}
      />
    </div>
  )
}

// Simple bracket view for tournaments without losers bracket
function SimpleBracketView({ 
  matches, 
  teams, 
  tournamentId, 
  stage, 
  title,
  groups 
}: BracketViewProps) {
  const bracketMatches = matches
    .filter((m) => 
      m.stage === stage && 
      !m.id.includes("3rd") && 
      !m.id.includes("5th") && 
      !m.id.includes("7th") &&
      !m.id.includes("sf58")
    )
    .sort((a, b) => {
      if ((a.bracketRound ?? 0) !== (b.bracketRound ?? 0))
        return (a.bracketRound ?? 0) - (b.bracketRound ?? 0)
      return (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
    })

  const thirdPlaceMatch = matches.find((m) => m.stage === stage && m.id.includes("3rd"))

  if (bracketMatches.length === 0) {
    return null
  }

  // Group matches by round
  const rounds = new Map<number, Match[]>()
  bracketMatches.forEach((m) => {
    const round = m.bracketRound ?? 0
    if (!rounds.has(round)) rounds.set(round, [])
    rounds.get(round)!.push(m)
  })

  const totalRounds = Math.max(...Array.from(rounds.keys())) + 1

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

  return (
    <div className="space-y-6">
      {title && <h3 className="text-lg font-bold">{title}</h3>}

      {/* Desktop bracket view */}
      <div className="hidden overflow-x-auto md:block">
        <div 
          className="inline-flex items-start gap-6 pb-4" 
          style={{ minWidth: `${totalRounds * 220}px` }}
        >
          {Array.from(rounds.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundMatches]) => {
              const label = getHungarianRoundLabel(round, totalRounds)
              const gapMultiplier = Math.pow(2, round)
              const isLastRound = round === totalRounds - 1

              return (
                <div key={round} className="flex flex-col items-center">
                  <span className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
                      <BracketMatchCard
                        key={match.id}
                        match={match}
                        teams={teams}
                        tournamentId={tournamentId}
                        showColoredAbbr
                        groups={groups}
                        variant={isLastRound ? "final" : "default"}
                      />
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
                      showColoredAbbr
                      groups={groups}
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
            showColoredAbbr
            groups={groups}
            variant="bronze"
          />
        </div>
      )}
    </div>
  )
}

// Mobile list view for complex bracket
function MobileListView({ 
  categorized, 
  teams, 
  tournamentId,
  groups,
  stage 
}: { 
  categorized: Map<MatchType, BracketMatchInfo[]>
  teams: Team[]
  tournamentId: string
  groups?: Group[]
  stage: MatchStage
}) {
  const isConsolation = stage === "consolation"
  const sections: { type: MatchType; label: string }[] = [
    { type: "qf", label: "Negyeddöntő" },
    { type: "sf", label: isConsolation ? "Elődöntő (9-12)" : "Elődöntő (1-4)" },
    { type: "sf58", label: isConsolation ? "Elődöntő (13-16)" : "Elődöntő (5-8)" },
    { type: "final", label: "Döntő" },
    { type: "3rd", label: isConsolation ? "11. helyért" : "Bronzmérkőzés" },
    { type: "5th", label: isConsolation ? "13. helyért" : "5. helyért" },
    { type: "7th", label: isConsolation ? "15. helyért" : "7. helyért" },
  ]

  return (
    <div className="space-y-4 md:hidden">
      {sections.map(({ type, label }) => {
        const infos = categorized.get(type) ?? []
        if (infos.length === 0) return null
        
        return (
          <div key={type} className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
            <div className="space-y-2">
              {infos.map((info) => (
                <BracketMatchCard
                  key={info.match.id}
                  match={info.match}
                  teams={teams}
                  tournamentId={tournamentId}
                  className="w-full"
                  showColoredAbbr
                  groups={groups}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
