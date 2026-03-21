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
  | "qf_losers"    // QF losers bracket (5-8 helyért 1. kör)
  | "sf"           // Semi-finals (Elődöntő)
  | "sf_5th"       // Semi-final for 5th place (5-8 helyért 2. kör)
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
    case "qf_losers": return isConsolation ? "13-16. helyért" : "5-8. helyért"
    case "sf": return "Elődöntő"
    case "sf_5th": return isConsolation ? "13-16. helyért" : "5-8. helyért"
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
    } else if (match.id.includes("sf-5th") || match.id.includes("sf5")) {
      type = "sf_5th"
    } else if (match.id.includes("qf-losers") || match.id.includes("qfl")) {
      type = "qf_losers"
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
  const qfLosers = categorized.get("qf_losers") ?? []
  const sf = categorized.get("sf") ?? []
  const sf5th = categorized.get("sf_5th") ?? []
  const finalMatch = categorized.get("final") ?? []
  const thirdPlace = categorized.get("3rd") ?? []
  const fifthPlace = categorized.get("5th") ?? []
  const seventhPlace = categorized.get("7th") ?? []

  // Determine if we have a complex bracket with losers (placement matches for 5-8)
  const hasPlacementMatches = qfLosers.length > 0 || sf5th.length > 0 || fifthPlace.length > 0 || seventhPlace.length > 0
  
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
  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold">{title}</h3>
      
      {/* Desktop complex bracket view */}
      <div className="hidden overflow-x-auto lg:block">
        <div className="min-w-[1100px] pb-4">
          {/* Column Headers */}
          <div className="mb-4 grid grid-cols-7 gap-3">
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Negyeddöntő
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "13-16. helyért" : "5-8. helyért"}
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Elődöntő
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "13-16. helyért" : "5-8. helyért"}
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "11. helyért" : "Bronzmérkőzés"}
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {isConsolation ? "13./15. helyért" : "5./7. helyért"}
            </div>
            <div className="text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Döntő
            </div>
          </div>

          {/* Bracket Grid */}
          <div className="relative grid grid-cols-7 gap-3">
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

            {/* Column 2: QF losers - 5-8 placement round 1 */}
            <div className="flex flex-col justify-around gap-6" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
              {qfLosers.map((info) => (
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

            {/* Column 3: Semi-finals */}
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

            {/* Column 4: Semi-finals for 5th place */}
            <div className="flex flex-col justify-around gap-6" style={{ paddingTop: '2.5rem', paddingBottom: '2.5rem' }}>
              {sf5th.map((info) => (
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

            {/* Column 5: 3rd place match */}
            <div className="flex flex-col justify-center">
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

            {/* Column 6: 5th and 7th place matches */}
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

            {/* Column 7: Final */}
            <div className="flex flex-col justify-center">
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
      !m.id.includes("qf-losers") &&
      !m.id.includes("sf-5th")
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
    { type: "qf_losers", label: isConsolation ? "13-16. helyért (1. kör)" : "5-8. helyért (1. kör)" },
    { type: "sf", label: "Elődöntő" },
    { type: "sf_5th", label: isConsolation ? "13-16. helyért (2. kör)" : "5-8. helyért (2. kör)" },
    { type: "3rd", label: isConsolation ? "11. helyért" : "Bronzmérkőzés" },
    { type: "5th", label: isConsolation ? "13. helyért" : "5. helyért" },
    { type: "7th", label: isConsolation ? "15. helyért" : "7. helyért" },
    { type: "final", label: "Döntő" },
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
