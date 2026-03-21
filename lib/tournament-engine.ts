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
      qualified: "consolation",
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

  // Add 5th-8th placement matches if we have 8+ teams (for main bracket)
  if (numTeams >= 8 && stage === "main") {
    // QF losers play each other (2 matches) - these feed into sf-5th
    const qfLosers1Id = `${stage}-qf-losers-${matchIdCounter++}`
    const qfLosers2Id = `${stage}-qf-losers-${matchIdCounter++}`
    
    // Semi-finals for 5th place (losers of QF losers matches play for 7th, winners for 5th)
    const sf5th1Id = `${stage}-sf-5th-${matchIdCounter++}`
    const sf5th2Id = `${stage}-sf-5th-${matchIdCounter++}`
    
    // 5th place match (winners of sf5th)
    const fifthPlaceId = `${stage}-5th-${matchIdCounter++}`
    
    // 7th place match (losers of sf5th)
    const seventhPlaceId = `${stage}-7th-${matchIdCounter++}`

    // QF Losers match 1 (losers from QF match 0 and 1)
    matches.push({
      id: qfLosers1Id,
      tournamentId,
      stage,
      bracketRound: 2,
      bracketPosition: 10, // Special position to distinguish
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: sf5th1Id,
      nextMatchSlot: "home",
    })

    // QF Losers match 2 (losers from QF match 2 and 3)
    matches.push({
      id: qfLosers2Id,
      tournamentId,
      stage,
      bracketRound: 2,
      bracketPosition: 11,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: sf5th2Id,
      nextMatchSlot: "home",
    })

    // SF for 5th match 1 (winner of qfLosers1 vs loser of SF1)
    matches.push({
      id: sf5th1Id,
      tournamentId,
      stage,
      bracketRound: 3,
      bracketPosition: 10,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: fifthPlaceId,
      nextMatchSlot: "home",
    })

    // SF for 5th match 2 (winner of qfLosers2 vs loser of SF2)
    matches.push({
      id: sf5th2Id,
      tournamentId,
      stage,
      bracketRound: 3,
      bracketPosition: 11,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: fifthPlaceId,
      nextMatchSlot: "away",
    })

    // 5th place match
    matches.push({
      id: fifthPlaceId,
      tournamentId,
      stage,
      bracketRound: 4,
      bracketPosition: 10,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: undefined,
    })

    // 7th place match (losers of sf5th matches)
    matches.push({
      id: seventhPlaceId,
      tournamentId,
      stage,
      bracketRound: 4,
      bracketPosition: 11,
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

  let updatedMatches = [...matches]

  // Advance winner to next match
  if (match.nextMatchId) {
    updatedMatches = updatedMatches.map((m) => {
      if (m.id === match.nextMatchId) {
        return {
          ...m,
          [match.nextMatchSlot === "home" ? "homeTeamId" : "awayTeamId"]: winnerId,
        }
      }
      return m
    })
  }

  // Handle loser advancement for placement matches
  const stage = match.stage
  
  // If this is a QF match (round 1 in 8-team bracket), send loser to qf-losers
  if (match.bracketRound === 1 && !match.id.includes("losers") && !match.id.includes("5th") && !match.id.includes("7th")) {
    const position = match.bracketPosition ?? 0
    // QF matches 0,1 losers go to qf-losers match 1, QF matches 2,3 losers go to qf-losers match 2
    const qfLosersMatchNum = position < 2 ? 1 : 2
    const slot = position % 2 === 0 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-qf-losers`) && m.bracketPosition === (qfLosersMatchNum === 1 ? 10 : 11)) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
  }

  // If this is a SF match (round 2 in 8-team bracket), send loser to sf-5th (for 5th-8th placement)
  if (match.bracketRound === 2 && !match.id.includes("losers") && !match.id.includes("5th") && !match.id.includes("7th") && !match.id.includes("3rd")) {
    const position = match.bracketPosition ?? 0
    // SF match 0 loser goes to sf-5th match 1, SF match 1 loser goes to sf-5th match 2
    const sf5thMatchPos = position === 0 ? 10 : 11
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-sf-5th`) && m.bracketPosition === sf5thMatchPos) {
        return { ...m, awayTeamId: loserId }
      }
      return m
    })
  }

  // If this is a SF match, also send loser to 3rd place match
  if (match.bracketRound === 2 && !match.id.includes("losers") && !match.id.includes("5th") && !match.id.includes("7th")) {
    const position = match.bracketPosition ?? 0
    const slot = position === 0 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-3rd`)) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
  }

  // If this is a sf-5th match, send loser to 7th place match
  if (match.id.includes("sf-5th")) {
    const position = match.bracketPosition ?? 0
    const slot = position === 10 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-7th`)) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
  }

  // If this is a qf-losers match, winner goes to sf-5th (already handled by nextMatchId)
  // but we need to advance the winner properly
  if (match.id.includes("qf-losers")) {
    // Winner already advances via nextMatchId
  }

  return updatedMatches
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

  // 5th and 6th from 5th place match
  const fifthPlaceMatch = mainMatches.find((m) => m.id.includes("5th"))
  if (fifthPlaceMatch && fifthPlaceMatch.status === "completed" && fifthPlaceMatch.homeScore != null && fifthPlaceMatch.awayScore != null) {
    const winnerId = fifthPlaceMatch.homeScore > fifthPlaceMatch.awayScore ? fifthPlaceMatch.homeTeamId : fifthPlaceMatch.awayTeamId
    const loserId = fifthPlaceMatch.homeScore > fifthPlaceMatch.awayScore ? fifthPlaceMatch.awayTeamId : fifthPlaceMatch.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "5th Place Match Winner" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "5th Place Match Loser" })
    }
  } else {
    pos = Math.max(pos, 7)
  }

  // 7th and 8th from 7th place match
  const seventhPlaceMatch = mainMatches.find((m) => m.id.includes("7th"))
  if (seventhPlaceMatch && seventhPlaceMatch.status === "completed" && seventhPlaceMatch.homeScore != null && seventhPlaceMatch.awayScore != null) {
    const winnerId = seventhPlaceMatch.homeScore > seventhPlaceMatch.awayScore ? seventhPlaceMatch.homeTeamId : seventhPlaceMatch.awayTeamId
    const loserId = seventhPlaceMatch.homeScore > seventhPlaceMatch.awayScore ? seventhPlaceMatch.awayTeamId : seventhPlaceMatch.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "7th Place Match Winner" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "7th Place Match Loser" })
    }
  } else {
    // Fallback: 5th-8th from main bracket semi-final losers (ordered by group standing)
    const mainSFLosers = getSemiFinalLosers(mainMatches, teams)
    for (const team of mainSFLosers) {
      if (!placements.find((p) => p.teamId === team.id)) {
        placements.push({ position: pos++, teamId: team.id, team, source: "Main Bracket QF/SF" })
      }
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
  // Filter out placement matches (5th, 7th, qf-losers, sf-5th) to find the true final
  const mainBracketMatches = matches.filter((m) => 
    !m.id.includes("3rd") && 
    !m.id.includes("5th") && 
    !m.id.includes("7th") && 
    !m.id.includes("qf-losers") && 
    !m.id.includes("sf-5th")
  )
  if (mainBracketMatches.length === 0) return null
  const maxRound = Math.max(...mainBracketMatches.map((m) => m.bracketRound ?? 0))
  return mainBracketMatches.find((m) => m.bracketRound === maxRound && m.bracketPosition === 0) ?? null
}

function findThirdPlaceMatch(matches: Match[]): Match | null {
  // Find by match ID pattern which is more reliable
  return matches.find((m) => m.id.includes("3rd")) ?? null
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
    case 0: return "Döntő"
    case 1: return "Elődöntő"
    case 2: return "Negyeddöntő"
    case 3: return "Nyolcaddöntő"
    default: return `${round + 1}. Forduló`
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
