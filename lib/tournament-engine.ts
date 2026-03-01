import type { Group, GroupStanding, Match, Team, Tournament, BracketSlot, MatchStage } from "./types"

// ── Group standings ───────────────────────────────────

function computeFairPlayScore(
  yellowCards: number,
  redCards: number,
): number {
  // FIFA fair play: yellow = -1, red = -4
  return -(yellowCards * 1 + redCards * 4)
}

export function calculateGroupStandings(
  group: Group,
  teams: Team[],
  matches: Match[],
): GroupStanding[] {
  const groupTeams = teams.filter((t) => group.teamIds.includes(t.id))
  const groupMatches = matches.filter(
    (m) => m.stage === "group" && m.groupId === group.id && m.status === "completed",
  )

  // Build raw standings
  const standingsMap = new Map<string, GroupStanding>()
  for (const team of groupTeams) {
    standingsMap.set(team.id, {
      teamId: team.id,
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
      fairPlayScore: 0,
      rank: 0,
      qualified: null,
    })
  }

  for (const match of groupMatches) {
    if (match.homeTeamId == null || match.awayTeamId == null) continue
    if (match.homeScore == null || match.awayScore == null) continue

    const home = standingsMap.get(match.homeTeamId)
    const away = standingsMap.get(match.awayTeamId)
    if (!home || !away) continue

    home.played++
    away.played++
    home.goalsFor += match.homeScore
    home.goalsAgainst += match.awayScore
    away.goalsFor += match.awayScore
    away.goalsAgainst += match.homeScore

    home.fairPlayScore += computeFairPlayScore(
      match.homeYellowCards ?? 0,
      match.homeRedCards ?? 0,
    )
    away.fairPlayScore += computeFairPlayScore(
      match.awayYellowCards ?? 0,
      match.awayRedCards ?? 0,
    )

    if (match.homeScore > match.awayScore) {
      home.won++
      home.points += 3
      away.lost++
    } else if (match.homeScore < match.awayScore) {
      away.won++
      away.points += 3
      home.lost++
    } else {
      home.drawn++
      away.drawn++
      home.points += 1
      away.points += 1
    }
  }

  // Compute GD
  for (const s of standingsMap.values()) {
    s.goalDifference = s.goalsFor - s.goalsAgainst
  }

  let standings = Array.from(standingsMap.values())

  // Sort with FIFA tie-breaker cascade
  standings = sortStandingsWithTieBreakers(standings, groupMatches, group.id)

  // Assign ranks and qualification
  standings.forEach((s, i) => {
    s.rank = i + 1
    if (groupMatches.length > 0) {
      s.qualified = i < 2 ? "main" : "consolation"
    }
  })

  return standings
}

function sortStandingsWithTieBreakers(
  standings: GroupStanding[],
  matches: Match[],
  groupId: string,
): GroupStanding[] {
  return standings.sort((a, b) => {
    // 1. Points
    if (b.points !== a.points) return b.points - a.points
    // 2. Goal difference
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    // 3. Goals scored
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor

    // 4-6. Head-to-head among tied teams
    const h2h = computeH2H(a.teamId, b.teamId, matches)
    if (h2h.aPoints !== h2h.bPoints) return h2h.bPoints - h2h.aPoints
    if (h2h.bGD !== h2h.aGD) return h2h.bGD - h2h.aGD
    if (h2h.bGF !== h2h.aGF) return h2h.bGF - h2h.aGF

    // 7. Fair play score (higher/less negative is better)
    if (a.fairPlayScore !== b.fairPlayScore) return b.fairPlayScore - a.fairPlayScore

    // 8. Deterministic tiebreak using team + group IDs
    const seedA = hashCode(`${groupId}-${a.teamId}`)
    const seedB = hashCode(`${groupId}-${b.teamId}`)
    return seedB - seedA
  })
}

function computeH2H(
  teamAId: string,
  teamBId: string,
  matches: Match[],
): { aPoints: number; bPoints: number; aGD: number; bGD: number; aGF: number; bGF: number } {
  let aPoints = 0, bPoints = 0, aGF = 0, bGF = 0

  for (const m of matches) {
    if (m.homeScore == null || m.awayScore == null) continue
    const isAHome = m.homeTeamId === teamAId && m.awayTeamId === teamBId
    const isBHome = m.homeTeamId === teamBId && m.awayTeamId === teamAId

    if (isAHome) {
      aGF += m.homeScore
      bGF += m.awayScore
      if (m.homeScore > m.awayScore) aPoints += 3
      else if (m.homeScore < m.awayScore) bPoints += 3
      else { aPoints += 1; bPoints += 1 }
    } else if (isBHome) {
      bGF += m.homeScore
      aGF += m.awayScore
      if (m.homeScore > m.awayScore) bPoints += 3
      else if (m.homeScore < m.awayScore) aPoints += 3
      else { aPoints += 1; bPoints += 1 }
    }
  }

  return {
    aPoints, bPoints,
    aGD: aGF - bGF, bGD: bGF - aGF,
    aGF, bGF,
  }
}

function hashCode(s: string): number {
  let hash = 0
  for (let i = 0; i < s.length; i++) {
    const ch = s.charCodeAt(i)
    hash = ((hash << 5) - hash) + ch
    hash |= 0
  }
  return hash
}

// ── Bracket generation ────────────────────────────────

export function generateMainBracketSeeding(
  groups: Group[],
  allStandings: Map<string, GroupStanding[]>,
): { teamId: string; seed: number; label: string }[] {
  // Classic cross-group seeding: 1A vs 2B, 1C vs 2D, 1B vs 2A, 1D vs 2C
  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label))

  if (sortedGroups.length < 2) return []

  const pairings: [string, string][] = []
  // Pair groups: (0,1), (2,3), etc. If odd number of groups, last group gets a bye structure
  for (let i = 0; i < sortedGroups.length; i += 2) {
    if (i + 1 < sortedGroups.length) {
      pairings.push([sortedGroups[i].id, sortedGroups[i + 1].id])
    }
  }

  const seeds: { teamId: string; seed: number; label: string }[] = []
  let seedNum = 1

  for (const [gA, gB] of pairings) {
    const standingsA = allStandings.get(gA) ?? []
    const standingsB = allStandings.get(gB) ?? []

    if (standingsA.length >= 1 && standingsB.length >= 2) {
      seeds.push({ teamId: standingsA[0].teamId, seed: seedNum++, label: `1${getGroupLabel(groups, gA)}` })
      seeds.push({ teamId: standingsB[1].teamId, seed: seedNum++, label: `2${getGroupLabel(groups, gB)}` })
    }
    if (standingsB.length >= 1 && standingsA.length >= 2) {
      seeds.push({ teamId: standingsB[0].teamId, seed: seedNum++, label: `1${getGroupLabel(groups, gB)}` })
      seeds.push({ teamId: standingsA[1].teamId, seed: seedNum++, label: `2${getGroupLabel(groups, gA)}` })
    }
  }

  return seeds
}

export function generateConsolationBracketSeeding(
  groups: Group[],
  allStandings: Map<string, GroupStanding[]>,
): { teamId: string; seed: number; label: string }[] {
  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label))
  const seeds: { teamId: string; seed: number; label: string }[] = []
  let seedNum = 1

  const pairings: [string, string][] = []
  for (let i = 0; i < sortedGroups.length; i += 2) {
    if (i + 1 < sortedGroups.length) {
      pairings.push([sortedGroups[i].id, sortedGroups[i + 1].id])
    }
  }

  for (const [gA, gB] of pairings) {
    const standingsA = allStandings.get(gA) ?? []
    const standingsB = allStandings.get(gB) ?? []

    if (standingsA.length >= 3 && standingsB.length >= 4) {
      seeds.push({ teamId: standingsA[2].teamId, seed: seedNum++, label: `3${getGroupLabel(groups, gA)}` })
      seeds.push({ teamId: standingsB[3].teamId, seed: seedNum++, label: `4${getGroupLabel(groups, gB)}` })
    }
    if (standingsB.length >= 3 && standingsA.length >= 4) {
      seeds.push({ teamId: standingsB[2].teamId, seed: seedNum++, label: `3${getGroupLabel(groups, gB)}` })
      seeds.push({ teamId: standingsA[3].teamId, seed: seedNum++, label: `4${getGroupLabel(groups, gA)}` })
    }
  }

  return seeds
}

function getGroupLabel(groups: Group[], groupId: string): string {
  return groups.find((g) => g.id === groupId)?.label ?? "?"
}

export function generateBracketMatches(
  tournamentId: string,
  seeds: { teamId: string; seed: number; label: string }[],
  stage: MatchStage,
  startMatchId: number,
): Match[] {
  const numTeams = seeds.length
  if (numTeams < 2) return []

  // Calculate number of rounds (single elimination)
  const numRounds = Math.ceil(Math.log2(numTeams))
  const matches: Match[] = []
  let matchIdCounter = startMatchId

  // Generate bracket structure round by round
  const roundMatches: string[][] = []

  for (let round = 0; round < numRounds; round++) {
    const matchesInRound = Math.pow(2, numRounds - 1 - round)
    const roundMatchIds: string[] = []
    for (let pos = 0; pos < matchesInRound; pos++) {
      const matchId = `${stage}-r${round}-m${matchIdCounter++}`
      roundMatchIds.push(matchId)

      const match: Match = {
        id: matchId,
        tournamentId,
        stage,
        bracketRound: round,
        bracketPosition: pos,
        homeTeamId: null,
        awayTeamId: null,
        homeScore: null,
        awayScore: null,
        status: "scheduled",
        nextMatchId: null,
        nextMatchSlot: undefined,
      }

      // First round: seed teams
      if (round === 0) {
        const homeIdx = pos * 2
        const awayIdx = pos * 2 + 1
        match.homeTeamId = homeIdx < seeds.length ? seeds[homeIdx].teamId : null
        match.awayTeamId = awayIdx < seeds.length ? seeds[awayIdx].teamId : null
      }

      matches.push(match)
    }
    roundMatches.push(roundMatchIds)
  }

  // Link matches to their next round
  for (let round = 0; round < numRounds - 1; round++) {
    const currentRoundIds = roundMatches[round]
    const nextRoundIds = roundMatches[round + 1]
    for (let i = 0; i < currentRoundIds.length; i++) {
      const match = matches.find((m) => m.id === currentRoundIds[i])
      if (match) {
        const nextMatchIdx = Math.floor(i / 2)
        match.nextMatchId = nextRoundIds[nextMatchIdx]
        match.nextMatchSlot = i % 2 === 0 ? "home" : "away"
      }
    }
  }

  // Add 3rd place match if we have at least 4 teams
  if (numTeams >= 4) {
    const thirdPlaceId = `${stage}-3rd-${matchIdCounter++}`
    const thirdPlaceMatch: Match = {
      id: thirdPlaceId,
      tournamentId,
      stage,
      bracketRound: numRounds - 1,
      bracketPosition: 1, // position 1 alongside the final (position 0)
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: undefined,
    }
    matches.push(thirdPlaceMatch)
  }

  // Add 5th place match if we have at least 8 teams (losers of quarter-finals play for 5th-8th)
  if (numTeams >= 8) {
    // 5th place match
    const fifthPlaceId = `${stage}-5th-${matchIdCounter++}`
    matches.push({
      id: fifthPlaceId,
      tournamentId,
      stage,
      bracketRound: numRounds - 1,
      bracketPosition: 2,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: undefined,
    })

    // 7th place match
    const seventhPlaceId = `${stage}-7th-${matchIdCounter++}`
    matches.push({
      id: seventhPlaceId,
      tournamentId,
      stage,
      bracketRound: numRounds - 1,
      bracketPosition: 3,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: undefined,
    })
  }

  return matches
}

export function advanceBracketWinner(
  matches: Match[],
  matchId: string,
): Match[] {
  const match = matches.find((m) => m.id === matchId)
  if (!match || match.homeScore == null || match.awayScore == null) return matches

  const winnerId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId
  const loserId = match.homeScore > match.awayScore ? match.awayTeamId : match.homeTeamId

  let updated = [...matches]

  // Advance winner to next match
  if (match.nextMatchId) {
    updated = updated.map((m) => {
      if (m.id === match.nextMatchId) {
        return {
          ...m,
          [match.nextMatchSlot === "home" ? "homeTeamId" : "awayTeamId"]: winnerId,
        }
      }
      return m
    })
  }

  // If this is a semi-final, send losers to placement matches (3rd, 5th, 7th place)
  const stageMatches = matches.filter((m) => m.stage === match.stage && !m.id.includes("3rd") && !m.id.includes("5th") && !m.id.includes("7th") && !m.id.includes("playoff"))
  const maxRound = Math.max(...stageMatches.map((m) => m.bracketRound ?? 0))
  const sfRound = maxRound - 1

  // Semi-final loser goes to 3rd place match
  if (match.bracketRound === sfRound && sfRound >= 0) {
    const thirdPlaceMatch = matches.find((m) => m.stage === match.stage && m.id.includes("3rd"))
    if (thirdPlaceMatch && loserId) {
      const slot = (match.bracketPosition ?? 0) % 2 === 0 ? "homeTeamId" : "awayTeamId"
      updated = updated.map((m) => {
        if (m.id === thirdPlaceMatch.id) {
          return { ...m, [slot]: loserId }
        }
        return m
      })
    }
  }

  // Quarter-final losers go to 5th/7th place matches
  const qfRound = maxRound - 2
  if (match.bracketRound === qfRound && qfRound >= 0 && loserId) {
    const fifthPlaceMatch = matches.find((m) => m.stage === match.stage && m.id.includes("5th"))
    const seventhPlaceMatch = matches.find((m) => m.stage === match.stage && m.id.includes("7th"))
    const pos = match.bracketPosition ?? 0

    if (pos < 2 && fifthPlaceMatch) {
      const slot = pos % 2 === 0 ? "homeTeamId" : "awayTeamId"
      updated = updated.map((m) => {
        if (m.id === fifthPlaceMatch.id) {
          return { ...m, [slot]: loserId }
        }
        return m
      })
    } else if (pos >= 2 && seventhPlaceMatch) {
      const slot = pos % 2 === 0 ? "homeTeamId" : "awayTeamId"
      updated = updated.map((m) => {
        if (m.id === seventhPlaceMatch.id) {
          return { ...m, [slot]: loserId }
        }
        return m
      })
    }
  }

  return updated
}

// ── Final placements ──────────────────────────────────

export interface Placement {
  position: number
  teamId: string
  team: Team
  source: string // e.g. "Main Bracket Winner", "Group A - 1st"
}

export function calculateFinalPlacements(
  tournament: Tournament,
  allStandings: Map<string, GroupStanding[]>,
): Placement[] {
  const placements: Placement[] = []
  const teams = tournament.teams
  const matches = tournament.matches

  const mainMatches = matches.filter((m) => m.stage === "main")
  const consolationMatches = matches.filter((m) => m.stage === "consolation")

  // Find finals for each bracket
  const mainFinal = findFinalMatch(mainMatches)
  const mainThirdPlace = findThirdPlaceMatch(mainMatches)
  const consolationFinal = findFinalMatch(consolationMatches)
  const consolationThirdPlace = findThirdPlaceMatch(consolationMatches)

  let pos = 1

  // 1st and 2nd from main final
  if (mainFinal && mainFinal.status === "completed" && mainFinal.homeScore != null && mainFinal.awayScore != null) {
    const winnerId = mainFinal.homeScore > mainFinal.awayScore ? mainFinal.homeTeamId : mainFinal.awayTeamId
    const loserId = mainFinal.homeScore > mainFinal.awayScore ? mainFinal.awayTeamId : mainFinal.homeTeamId
    if (winnerId) placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Champion" })
    if (loserId) placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Runner-up" })
  } else {
    pos = 3
  }

  // 3rd and 4th from main 3rd place match
  if (mainThirdPlace && mainThirdPlace.status === "completed" && mainThirdPlace.homeScore != null && mainThirdPlace.awayScore != null) {
    const winnerId = mainThirdPlace.homeScore > mainThirdPlace.awayScore ? mainThirdPlace.homeTeamId : mainThirdPlace.awayTeamId
    const loserId = mainThirdPlace.homeScore > mainThirdPlace.awayScore ? mainThirdPlace.awayTeamId : mainThirdPlace.homeTeamId
    if (winnerId) placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "3rd Place Match Winner" })
    if (loserId) placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "3rd Place Match Loser" })
  } else {
    pos = 5
  }

  // 5th-8th from main bracket semi-final losers (ordered by group standing)
  const mainSFLosers = getSemiFinalLosers(mainMatches, teams)
  for (const team of mainSFLosers) {
    if (!placements.find((p) => p.teamId === team.id)) {
      placements.push({ position: pos++, teamId: team.id, team, source: "Main Bracket QF/SF" })
    }
  }
  pos = Math.max(pos, 9)

  // 9th-16th from consolation bracket (same logic)
  if (consolationFinal && consolationFinal.status === "completed" && consolationFinal.homeScore != null && consolationFinal.awayScore != null) {
    const winnerId = consolationFinal.homeScore > consolationFinal.awayScore ? consolationFinal.homeTeamId : consolationFinal.awayTeamId
    const loserId = consolationFinal.homeScore > consolationFinal.awayScore ? consolationFinal.awayTeamId : consolationFinal.homeTeamId
    if (winnerId) placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation Winner" })
    if (loserId) placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation Runner-up" })
  }

  if (consolationThirdPlace && consolationThirdPlace.status === "completed" && consolationThirdPlace.homeScore != null && consolationThirdPlace.awayScore != null) {
    const winnerId = consolationThirdPlace.homeScore > consolationThirdPlace.awayScore ? consolationThirdPlace.homeTeamId : consolationThirdPlace.awayTeamId
    const loserId = consolationThirdPlace.homeScore > consolationThirdPlace.awayScore ? consolationThirdPlace.awayTeamId : consolationThirdPlace.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation 3rd Place" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation 4th Place" })
    }
  }

  // Fill remaining from consolation SF losers
  const consolationSFLosers = getSemiFinalLosers(consolationMatches, teams)
  for (const team of consolationSFLosers) {
    if (!placements.find((p) => p.teamId === team.id)) {
      placements.push({ position: pos++, teamId: team.id, team, source: "Consolation Bracket" })
    }
  }

  return placements
}

function findFinalMatch(matches: Match[]): Match | null {
  if (matches.length === 0) return null
  const maxRound = Math.max(...matches.map((m) => m.bracketRound ?? 0))
  return matches.find((m) => m.bracketRound === maxRound && m.bracketPosition === 0) ?? null
}

function findThirdPlaceMatch(matches: Match[]): Match | null {
  if (matches.length === 0) return null
  const maxRound = Math.max(...matches.map((m) => m.bracketRound ?? 0))
  return matches.find((m) => m.bracketRound === maxRound && m.bracketPosition === 1) ?? null
}

function getSemiFinalLosers(matches: Match[], teams: Team[]): Team[] {
  const maxRound = Math.max(...matches.map((m) => m.bracketRound ?? 0))
  const sfRound = maxRound - 1
  if (sfRound < 0) return []

  const sfMatches = matches.filter((m) => m.bracketRound === sfRound && m.status === "completed")
  const losers: Team[] = []
  for (const m of sfMatches) {
    if (m.homeScore == null || m.awayScore == null) continue
    const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId
    if (loserId) {
      const team = teams.find((t) => t.id === loserId)
      if (team) losers.push(team)
    }
  }
  return losers
}

function findTeam(teams: Team[], teamId: string): Team {
  return teams.find((t) => t.id === teamId) ?? { id: teamId, name: "TBD", abbreviation: "TBD", groupId: "" }
}

// ── Utility exports ──────────────────────────────────

export function getMatchesForTeam(matches: Match[], teamId: string): Match[] {
  return matches.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId)
}

export function getGroupMatches(matches: Match[], groupId: string): Match[] {
  return matches.filter((m) => m.stage === "group" && m.groupId === groupId)
}

export function getBracketMatches(matches: Match[], stage: MatchStage): Match[] {
  return matches.filter((m) => m.stage === stage)
}

export function getRoundLabel(round: number, totalRounds: number): string {
  const roundsFromEnd = totalRounds - 1 - round
  switch (roundsFromEnd) {
    case 0: return "Final"
    case 1: return "Semi-Finals"
    case 2: return "Quarter-Finals"
    case 3: return "Round of 16"
    default: return `Round ${round + 1}`
  }
}

export function getBracketSlots(
  matches: Match[],
  teams: Team[],
  stage: MatchStage,
): BracketSlot[] {
  const bracketMatches = matches
    .filter((m) => m.stage === stage && !m.id.includes("3rd"))
    .sort((a, b) => {
      if ((a.bracketRound ?? 0) !== (b.bracketRound ?? 0)) return (a.bracketRound ?? 0) - (b.bracketRound ?? 0)
      return (a.bracketPosition ?? 0) - (b.bracketPosition ?? 0)
    })

  return bracketMatches.map((m) => ({
    matchId: m.id,
    match: m,
    round: m.bracketRound ?? 0,
    position: m.bracketPosition ?? 0,
    homeTeam: m.homeTeamId ? teams.find((t) => t.id === m.homeTeamId) ?? null : null,
    awayTeam: m.awayTeamId ? teams.find((t) => t.id === m.awayTeamId) ?? null : null,
  }))
}
