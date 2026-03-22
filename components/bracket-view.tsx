"use client"

import type { Match, Team, MatchStage, Group } from "@/lib/types"
import { BracketMatchCard } from "@/components/bracket-match-card"
import { MatchCard } from "@/components/match-card"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


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

      {/* Desktop complex bracket view - CSS Grid layout: 5 columns x 7 rows */}
      <div className="hidden overflow-x-auto md:block">
        <div className="relative min-w-[1000px] pb-4">
          {/* CSS Grid: 5 columns, 7 rows - compact layout with labels */}
          <div
            className="relative grid"
            style={{
              gridTemplateColumns: 'repeat(5, auto)',
              gridTemplateRows: 'repeat(7, auto)',
              gap: '12px 16px',
              padding: '32px 8px',
              justifyContent: 'center'
            }}
          >
            {/* QF1 - top */}
            <div style={{ gridColumn: 3, gridRow: 1 }} className="relative flex flex-col items-center">
              {qf[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">{isConsolation ? "Negyeddöntő (9-16)" : "Negyeddöntő"}</span>
                  <div className="relative">
                    {/* Winner arrow to SF - green going right then down */}
                    <div className="absolute -right-4 top-[25%] h-0.5 w-4 bg-green-500" />
                    <div className="absolute -right-4 top-[25%] h-[calc(100%+24px)] w-0.5 bg-green-500" />
                    {/* Loser arrow to SF58 - red going left then down */}
                    <div className="absolute -left-4 bottom-[25%] h-0.5 w-4 bg-red-500" />
                    <div className="absolute -left-4 bottom-[25%] h-[calc(100%+24px)] w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={qf[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>

            {/* SF58 Upper - 5-8 placement semi */}
            <div style={{ gridColumn: 2, gridRow: 2 }} className="relative flex flex-col items-center">
              {sf58[0] && (
                <>
                  <span className="absolute -top-4 text-center text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "Helyosztó ED (13-16)" : "Helyosztó ED (5-8)"}
                  </span>
                  <div className="relative">
                    {/* Entry from QF loser - red from top */}
                    <div className="absolute -top-6 left-1/2 h-6 w-0.5 -translate-x-1/2 bg-red-500" />
                    {/* Winner to 5th place - green down */}
                    <div className="absolute -bottom-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    {/* Loser to 7th place - red left */}
                    <div className="absolute -left-4 bottom-[25%] h-0.5 w-4 bg-red-500" />
                    <BracketMatchCard
                      match={sf58[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="losers"
                    />
                  </div>
                </>
              )}
            </div>

            {/* SF Upper - main semi-final */}
            <div style={{ gridColumn: 4, gridRow: 2 }} className="relative flex flex-col items-center">
              {sf[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "Helyosztó ED (9-12)" : "Elődöntő"}
                  </span>
                  <div className="relative">
                    {/* Entry from QF winner - green from left then up */}
                    <div className="absolute -left-4 top-[25%] h-0.5 w-4 bg-green-500" />
                    {/* Winner to final - green down */}
                    <div className="absolute -bottom-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    {/* Loser to bronze - red down */}
                    <div className="absolute -bottom-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={sf[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>

            {/* QF2 */}
            <div style={{ gridColumn: 3, gridRow: 3 }} className="relative flex flex-col items-center">
              {qf[1] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">{isConsolation ? "Negyeddöntő (9-16)" : "Negyeddöntő"}</span>
                  <div className="relative">
                    {/* Winner arrow to SF - green going right then up */}
                    <div className="absolute -right-4 top-[25%] h-0.5 w-4 bg-green-500" />
                    <div className="absolute -right-4 top-[calc(-100%-24px)] h-[calc(100%+48px)] w-0.5 bg-green-500" />
                    {/* Loser arrow to SF58 - red going left then up */}
                    <div className="absolute -left-4 bottom-[25%] h-0.5 w-4 bg-red-500" />
                    <div className="absolute -left-4 top-[calc(-100%-24px)] h-[calc(100%+48px)] w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={qf[1].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>

            {/* 7th place */}
            <div style={{ gridColumn: 1, gridRow: 4 }} className="relative flex flex-col items-center">
              {seventhPlace[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "15. helyért" : "7. helyért"}
                  </span>
                  <div className="relative">
                    {/* Entry from SF58 losers - red from top and bottom */}
                    <div className="absolute -top-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <div className="absolute -bottom-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={seventhPlace[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="placement"
                    />
                  </div>
                </>
              )}
            </div>

            {/* 5th place */}
            <div style={{ gridColumn: 2, gridRow: 4 }} className="relative flex flex-col items-center">
              {fifthPlace[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "13. helyért" : "5. helyért"}
                  </span>
                  <div className="relative">
                    {/* Entry from SF58 winners - green from top and bottom */}
                    <div className="absolute -top-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    <div className="absolute -bottom-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    <BracketMatchCard
                      match={fifthPlace[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="placement"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Bronze match */}
            <div style={{ gridColumn: 4, gridRow: 4 }} className="relative flex flex-col items-center">
              {thirdPlace[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "11. helyért" : "Bronzmeccs"}
                  </span>
                  <div className="relative">
                    {/* Entry from SF losers - red from top and bottom */}
                    <div className="absolute -top-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <div className="absolute -bottom-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={thirdPlace[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="bronze"
                    />
                  </div>
                </>
              )}
            </div>

            {/* Final */}
            <div style={{ gridColumn: 5, gridRow: 4 }} className="relative flex flex-col items-center">
              {finalMatch[0] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">{isConsolation ? "9. helyért" : "Döntő"}</span>
                  <div className="relative">
                    {/* Entry from SF winners - green from top and bottom */}
                    <div className="absolute -top-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    <div className="absolute -bottom-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    <BracketMatchCard
                      match={finalMatch[0].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="final"
                    />
                  </div>
                </>
              )}
            </div>

            {/* QF3 */}
            <div style={{ gridColumn: 3, gridRow: 5 }} className="relative flex flex-col items-center">
              {qf[2] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">{isConsolation ? "Negyeddöntő (9-16)" : "Negyeddöntő"}</span>
                  <div className="relative">
                    {/* Winner arrow to SF - green going right then down */}
                    <div className="absolute -right-4 bottom-[25%] h-0.5 w-4 bg-green-500" />
                    <div className="absolute -right-4 bottom-[25%] h-[calc(100%+24px)] w-0.5 bg-green-500" />
                    {/* Loser arrow to SF58 - red going left then down */}
                    <div className="absolute -left-4 top-[25%] h-0.5 w-4 bg-red-500" />
                    <div className="absolute -left-4 top-[25%] h-[calc(100%+24px)] w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={qf[2].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>

            {/* SF58 Lower */}
            <div style={{ gridColumn: 2, gridRow: 6 }} className="relative flex flex-col items-center">
              {sf58[1] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "Helyosztó ED (13-16)" : "Helyosztó ED (5-8)"}
                  </span>
                  <div className="relative">
                    {/* Entry from QF loser - red from bottom */}
                    <div className="absolute -bottom-6 left-1/2 h-6 w-0.5 -translate-x-1/2 bg-red-500" />
                    {/* Winner to 5th place - green up */}
                    <div className="absolute -top-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    {/* Loser to 7th place - red left */}
                    <div className="absolute -left-4 top-[25%] h-0.5 w-4 bg-red-500" />
                    <BracketMatchCard
                      match={sf58[1].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                      variant="losers"
                    />
                  </div>
                </>
              )}
            </div>

            {/* SF Lower */}
            <div style={{ gridColumn: 4, gridRow: 6 }} className="relative flex flex-col items-center">
              {sf[1] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">
                    {isConsolation ? "Helyosztó ED (9-12)" : "Elődöntő"}
                  </span>
                  <div className="relative">
                    {/* Entry from QF winner - green from left */}
                    <div className="absolute -left-4 bottom-[25%] h-0.5 w-4 bg-green-500" />
                    {/* Winner to final - green up */}
                    <div className="absolute -top-6 left-[30%] h-6 w-0.5 bg-green-500" />
                    {/* Loser to bronze - red up */}
                    <div className="absolute -top-6 right-[30%] h-6 w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={sf[1].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>

            {/* QF4 */}
            <div style={{ gridColumn: 3, gridRow: 7 }} className="relative flex flex-col items-center">
              {qf[3] && (
                <>
                  <span className="absolute -top-4 text-[10px] font-medium text-muted-foreground">{isConsolation ? "Negyeddöntő (9-16)" : "Negyeddöntő"}</span>
                  <div className="relative">
                    {/* Winner arrow to SF - green going right then up */}
                    <div className="absolute -right-4 bottom-[25%] h-0.5 w-4 bg-green-500" />
                    <div className="absolute -right-4 bottom-[calc(100%+24px)] h-[calc(100%+48px)] w-0.5 bg-green-500" />
                    {/* Loser arrow to SF58 - red going left then up */}
                    <div className="absolute -left-4 top-[25%] h-0.5 w-4 bg-red-500" />
                    <div className="absolute -left-4 bottom-[calc(100%+24px)] h-[calc(100%+48px)] w-0.5 bg-red-500" />
                    <BracketMatchCard
                      match={qf[3].match}
                      teams={teams}
                      tournamentId={tournamentId}
                      showColoredAbbr
                      groups={groups}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tabbed view */}
      <div className="md:hidden">
        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bracket">Ágrajz</TabsTrigger>
            <TabsTrigger value="matches">Meccsek</TabsTrigger>
          </TabsList>
          <TabsContent value="bracket" className="pt-4">
            <MobileBracketView
              categorized={categorized}
              teams={teams}
              tournamentId={tournamentId}
              groups={groups}
              stage={stage}
            />
          </TabsContent>
          <TabsContent value="matches" className="pt-4">
            <MobileMatchListView
              matches={bracketMatches}
              teams={teams}
              tournamentId={tournamentId}
            />
          </TabsContent>
        </Tabs>
      </div>
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

      {/* Desktop bracket view with connectors */}
      <div className="hidden overflow-x-auto md:block">
        <BracketWithConnectors
          rounds={rounds}
          totalRounds={totalRounds}
          teams={teams}
          tournamentId={tournamentId}
          groups={groups}
          getHungarianRoundLabel={getHungarianRoundLabel}
        />
      </div>

      {/* Mobile tabbed view */}
      <div className="md:hidden">
        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bracket">Ágrajz</TabsTrigger>
            <TabsTrigger value="matches">Meccsek</TabsTrigger>
          </TabsList>
          <TabsContent value="bracket" className="pt-4">
            <div className="space-y-4">
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
              {/* 3rd place match in bracket tab */}
              {thirdPlaceMatch && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {stage === "main" ? "Bronzmérkőzés" : "11. helyért"}
                  </span>
                  <BracketMatchCard
                    match={thirdPlaceMatch}
                    teams={teams}
                    tournamentId={tournamentId}
                    className="w-full"
                    showColoredAbbr
                    groups={groups}
                    variant="bronze"
                  />
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="matches" className="pt-4">
            <MobileMatchListView
              matches={thirdPlaceMatch ? [...bracketMatches, thirdPlaceMatch] : bracketMatches}
              teams={teams}
              tournamentId={tournamentId}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* 3rd place match - desktop only */}
      {thirdPlaceMatch && (
        <div className="hidden space-y-2 md:block">
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

// Bracket with visual connectors
function BracketWithConnectors({
  rounds,
  totalRounds,
  teams,
  tournamentId,
  groups,
  getHungarianRoundLabel
}: {
  rounds: Map<number, Match[]>
  totalRounds: number
  teams: Team[]
  tournamentId: string
  groups?: Group[]
  getHungarianRoundLabel: (round: number, totalRounds: number) => string
}) {
  const CARD_HEIGHT = 72 // Height of each match card in pixels
  const CARD_WIDTH = 180 // Width of each match card
  const CONNECTOR_WIDTH = 40 // Width of connector space between columns
  const HEADER_HEIGHT = 32 // Height of the column header

  // Calculate vertical positions for matches in each round
  const roundPositions = Array.from(rounds.entries())
    .sort(([a], [b]) => a - b)
    .map(([round, roundMatches]) => {
      const matchCount = roundMatches.length
      const gapMultiplier = Math.pow(2, round)
      const gap = gapMultiplier * 32 // gap in pixels
      const topPadding = (gapMultiplier - 1) * 24 // paddingTop in pixels

      const positions = roundMatches.map((match, index) => {
        const y = HEADER_HEIGHT + topPadding + index * (CARD_HEIGHT + gap) + CARD_HEIGHT / 2
        return { match, y }
      })

      return { round, matches: roundMatches, positions }
    })

  // Generate connector paths
  const connectors: { path: string; key: string }[] = []

  for (let i = 0; i < roundPositions.length - 1; i++) {
    const currentRound = roundPositions[i]
    const nextRound = roundPositions[i + 1]

    const xStart = (i + 1) * (CARD_WIDTH + CONNECTOR_WIDTH) - CONNECTOR_WIDTH / 2
    const xEnd = (i + 1) * (CARD_WIDTH + CONNECTOR_WIDTH) + CONNECTOR_WIDTH / 2

    // Connect pairs of matches from current round to next round
    for (let j = 0; j < currentRound.positions.length; j += 2) {
      const match1 = currentRound.positions[j]
      const match2 = currentRound.positions[j + 1]
      const targetMatch = nextRound.positions[Math.floor(j / 2)]

      if (match1 && match2 && targetMatch) {
        // Horizontal line from first match
        connectors.push({
          key: `h1-${i}-${j}`,
          path: `M ${xStart - 10} ${match1.y} H ${xStart + 5}`
        })
        // Horizontal line from second match
        connectors.push({
          key: `h2-${i}-${j}`,
          path: `M ${xStart - 10} ${match2.y} H ${xStart + 5}`
        })
        // Vertical line connecting them
        connectors.push({
          key: `v-${i}-${j}`,
          path: `M ${xStart + 5} ${match1.y} V ${match2.y}`
        })
        // Horizontal line to target
        const midY = (match1.y + match2.y) / 2
        connectors.push({
          key: `ht-${i}-${j}`,
          path: `M ${xStart + 5} ${midY} H ${xEnd + 10}`
        })
      } else if (match1 && targetMatch) {
        // Single match connector (for finals)
        connectors.push({
          key: `single-${i}-${j}`,
          path: `M ${xStart - 10} ${match1.y} H ${xEnd + 10}`
        })
      }
    }
  }

  return (
    <div
      className="relative pb-4"
      style={{ minWidth: `${totalRounds * (CARD_WIDTH + CONNECTOR_WIDTH)}px` }}
    >
      {/* SVG Connectors */}
      <svg
        className="pointer-events-none absolute left-0 top-0"
        style={{
          width: `${totalRounds * (CARD_WIDTH + CONNECTOR_WIDTH)}px`,
          height: '600px',
          zIndex: 0
        }}
      >
        {connectors.map(({ path, key }) => (
          <path
            key={key}
            d={path}
            stroke="#d1d5db"
            strokeWidth="2"
            fill="none"
          />
        ))}
      </svg>

      {/* Match Cards Grid */}
      <div className="relative z-10 flex items-start" style={{ gap: `${CONNECTOR_WIDTH}px` }}>
        {roundPositions.map(({ round, matches }) => {
          const label = getHungarianRoundLabel(round, totalRounds)
          const gapMultiplier = Math.pow(2, round)
          const isLastRound = round === totalRounds - 1

          return (
            <div key={round} className="relative flex flex-col items-center" style={{ width: `${CARD_WIDTH}px` }}>
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
                {matches.map((match) => (
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
  )
}

// Mobile bracket view for complex bracket (shows bracket structure)
function MobileBracketView({
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
    <div className="space-y-4">
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

// Mobile match list view (shows all matches in a simple list with MatchCard)
function MobileMatchListView({
  matches,
  teams,
  tournamentId
}: {
  matches: Match[]
  teams: Team[]
  tournamentId: string
}) {
  // Sort matches: scheduled first, then by date/time
  const sortedMatches = [...matches].sort((a, b) => {
    // Completed matches at the bottom
    if (a.status === "completed" && b.status !== "completed") return 1
    if (a.status !== "completed" && b.status === "completed") return -1
    
    // Sort by date if available
    if (a.scheduledTime && b.scheduledTime) {
      return new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    }
    
    // Sort by bracket round and position
    if ((a.bracketRound ?? 0) !== (b.bracketRound ?? 0)) {
      return (a.bracketRound ?? 0) - (b.bracketRound ?? 0)
    }
    return (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
  })

  return (
    <div className="space-y-2">
      {sortedMatches.map((match) => (
        <MatchCard
          key={match.id}
          match={match}
          teams={teams}
          tournamentId={tournamentId}
        />
      ))}
    </div>
  )
}
