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
  // Seeding for 4 groups (A, B, C, D): A1-B2, B1-C2, C1-D2, D1-A2
  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label))

  if (sortedGroups.length < 4) return []

  const groupA = sortedGroups.find((g) => g.label === "A")
  const groupB = sortedGroups.find((g) => g.label === "B")
  const groupC = sortedGroups.find((g) => g.label === "C")
  const groupD = sortedGroups.find((g) => g.label === "D")

  if (!groupA || !groupB || !groupC || !groupD) return []

  const standingsA = allStandings.get(groupA.id) ?? []
  const standingsB = allStandings.get(groupB.id) ?? []
  const standingsC = allStandings.get(groupC.id) ?? []
  const standingsD = allStandings.get(groupD.id) ?? []

  const seeds: { teamId: string; seed: number; label: string }[] = []

  // QF1: A1 vs B2
  if (standingsA[0]) seeds.push({ teamId: standingsA[0].teamId, seed: 1, label: "A1" })
  if (standingsB[1]) seeds.push({ teamId: standingsB[1].teamId, seed: 2, label: "B2" })
  
  // QF2: B1 vs C2
  if (standingsB[0]) seeds.push({ teamId: standingsB[0].teamId, seed: 3, label: "B1" })
  if (standingsC[1]) seeds.push({ teamId: standingsC[1].teamId, seed: 4, label: "C2" })
  
  // QF3: C1 vs D2
  if (standingsC[0]) seeds.push({ teamId: standingsC[0].teamId, seed: 5, label: "C1" })
  if (standingsD[1]) seeds.push({ teamId: standingsD[1].teamId, seed: 6, label: "D2" })
  
  // QF4: D1 vs A2
  if (standingsD[0]) seeds.push({ teamId: standingsD[0].teamId, seed: 7, label: "D1" })
  if (standingsA[1]) seeds.push({ teamId: standingsA[1].teamId, seed: 8, label: "A2" })

  return seeds
}

export function generateConsolationBracketSeeding(
  groups: Group[],
  allStandings: Map<string, GroupStanding[]>,
): { teamId: string; seed: number; label: string }[] {
  // Seeding for 4 groups (A, B, C, D): A3-B4, B3-C4, C3-D4, D3-A4
  const sortedGroups = [...groups].sort((a, b) => a.label.localeCompare(b.label))

  if (sortedGroups.length < 4) return []

  const groupA = sortedGroups.find((g) => g.label === "A")
  const groupB = sortedGroups.find((g) => g.label === "B")
  const groupC = sortedGroups.find((g) => g.label === "C")
  const groupD = sortedGroups.find((g) => g.label === "D")

  if (!groupA || !groupB || !groupC || !groupD) return []

  const standingsA = allStandings.get(groupA.id) ?? []
  const standingsB = allStandings.get(groupB.id) ?? []
  const standingsC = allStandings.get(groupC.id) ?? []
  const standingsD = allStandings.get(groupD.id) ?? []

  const seeds: { teamId: string; seed: number; label: string }[] = []

  // QF1: A3 vs B4
  if (standingsA[2]) seeds.push({ teamId: standingsA[2].teamId, seed: 1, label: "A3" })
  if (standingsB[3]) seeds.push({ teamId: standingsB[3].teamId, seed: 2, label: "B4" })
  
  // QF2: B3 vs C4
  if (standingsB[2]) seeds.push({ teamId: standingsB[2].teamId, seed: 3, label: "B3" })
  if (standingsC[3]) seeds.push({ teamId: standingsC[3].teamId, seed: 4, label: "C4" })
  
  // QF3: C3 vs D4
  if (standingsC[2]) seeds.push({ teamId: standingsC[2].teamId, seed: 5, label: "C3" })
  if (standingsD[3]) seeds.push({ teamId: standingsD[3].teamId, seed: 6, label: "D4" })
  
  // QF4: D3 vs A4
  if (standingsD[2]) seeds.push({ teamId: standingsD[2].teamId, seed: 7, label: "D3" })
  if (standingsA[3]) seeds.push({ teamId: standingsA[3].teamId, seed: 8, label: "A4" })

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

  // Add 5th-8th placement matches if we have 8 teams (for both main and consolation brackets)
  // Structure: QF losers -> SF 5-8 (2 matches) -> 5th place (winners) + 7th place (losers)
  if (numTeams >= 8) {
    // Semi-finals for 5-8 placement (QF losers play each other)
    // SF 5-8 match 1: loser of QF0 vs loser of QF1
    // SF 5-8 match 2: loser of QF2 vs loser of QF3
    const sf58_1Id = `${stage}-sf58-${matchIdCounter++}`
    const sf58_2Id = `${stage}-sf58-${matchIdCounter++}`
    
    // 5th place match (winners of SF 5-8)
    const fifthPlaceId = `${stage}-5th-${matchIdCounter++}`
    
    // 7th place match (losers of SF 5-8)
    const seventhPlaceId = `${stage}-7th-${matchIdCounter++}`

    // SF 5-8 match 1 (losers from QF match 0 and 1)
    matches.push({
      id: sf58_1Id,
      tournamentId,
      stage,
      bracketRound: 1, // Same round as SF (1-4)
      bracketPosition: 10, // Special position to distinguish from main SF
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: fifthPlaceId,
      nextMatchSlot: "home",
    })

    // SF 5-8 match 2 (losers from QF match 2 and 3)
    matches.push({
      id: sf58_2Id,
      tournamentId,
      stage,
      bracketRound: 1, // Same round as SF (1-4)
      bracketPosition: 11,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: fifthPlaceId,
      nextMatchSlot: "away",
    })

    // 5th place match (winners of SF 5-8)
    matches.push({
      id: fifthPlaceId,
      tournamentId,
      stage,
      bracketRound: 2, // Same round as Final
      bracketPosition: 10,
      homeTeamId: null,
      awayTeamId: null,
      homeScore: null,
      awayScore: null,
      status: "scheduled",
      nextMatchId: null,
      nextMatchSlot: undefined,
    })

    // 7th place match (losers of SF 5-8)
    matches.push({
      id: seventhPlaceId,
      tournamentId,
      stage,
      bracketRound: 2, // Same round as Final
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
  
  // If this is a QF match (round 0 in 8-team bracket), send loser to SF 5-8
  if (match.bracketRound === 0 && !match.id.includes("sf58") && !match.id.includes("5th") && !match.id.includes("7th") && !match.id.includes("3rd")) {
    const position = match.bracketPosition ?? 0
    // QF matches 0,1 losers go to SF 5-8 match 1, QF matches 2,3 losers go to SF 5-8 match 2
    const sf58MatchPos = position < 2 ? 10 : 11
    const slot = position % 2 === 0 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-sf58`) && m.bracketPosition === sf58MatchPos) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
  }

  // If this is a SF (1-4) match (round 1, position < 10), send loser to 3rd place match
  if (match.bracketRound === 1 && (match.bracketPosition ?? 0) < 10 && !match.id.includes("sf58") && !match.id.includes("5th") && !match.id.includes("7th")) {
    const position = match.bracketPosition ?? 0
    const slot = position === 0 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-3rd`)) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
  }

  // If this is a SF 5-8 match, send loser to 7th place match
  if (match.id.includes("sf58")) {
    const position = match.bracketPosition ?? 0
    const slot = position === 10 ? "homeTeamId" : "awayTeamId"
    
    updatedMatches = updatedMatches.map((m) => {
      if (m.id.includes(`${stage}-7th`)) {
        return { ...m, [slot]: loserId }
      }
      return m
    })
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

  // 9th-16th from consolation bracket (same logic as main)
  if (consolationFinal && consolationFinal.status === "completed" && consolationFinal.homeScore != null && consolationFinal.awayScore != null) {
    const winnerId = consolationFinal.homeScore > consolationFinal.awayScore ? consolationFinal.homeTeamId : consolationFinal.awayTeamId
    const loserId = consolationFinal.homeScore > consolationFinal.awayScore ? consolationFinal.awayTeamId : consolationFinal.homeTeamId
    if (winnerId) placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation Winner (9th)" })
    if (loserId) placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation Runner-up (10th)" })
  } else {
    pos = Math.max(pos, 11)
  }

  // 11th-12th from consolation 3rd place match
  if (consolationThirdPlace && consolationThirdPlace.status === "completed" && consolationThirdPlace.homeScore != null && consolationThirdPlace.awayScore != null) {
    const winnerId = consolationThirdPlace.homeScore > consolationThirdPlace.awayScore ? consolationThirdPlace.homeTeamId : consolationThirdPlace.awayTeamId
    const loserId = consolationThirdPlace.homeScore > consolationThirdPlace.awayScore ? consolationThirdPlace.awayTeamId : consolationThirdPlace.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation 3rd Place (11th)" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation 4th Place (12th)" })
    }
  } else {
    pos = Math.max(pos, 13)
  }

  // 13th-14th from consolation 5th place match
  const consolation5thMatch = consolationMatches.find((m) => m.id.includes("5th"))
  if (consolation5thMatch && consolation5thMatch.status === "completed" && consolation5thMatch.homeScore != null && consolation5thMatch.awayScore != null) {
    const winnerId = consolation5thMatch.homeScore > consolation5thMatch.awayScore ? consolation5thMatch.homeTeamId : consolation5thMatch.awayTeamId
    const loserId = consolation5thMatch.homeScore > consolation5thMatch.awayScore ? consolation5thMatch.awayTeamId : consolation5thMatch.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation 5th Place (13th)" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation 6th Place (14th)" })
    }
  } else {
    pos = Math.max(pos, 15)
  }

  // 15th-16th from consolation 7th place match
  const consolation7thMatch = consolationMatches.find((m) => m.id.includes("7th"))
  if (consolation7thMatch && consolation7thMatch.status === "completed" && consolation7thMatch.homeScore != null && consolation7thMatch.awayScore != null) {
    const winnerId = consolation7thMatch.homeScore > consolation7thMatch.awayScore ? consolation7thMatch.homeTeamId : consolation7thMatch.awayTeamId
    const loserId = consolation7thMatch.homeScore > consolation7thMatch.awayScore ? consolation7thMatch.awayTeamId : consolation7thMatch.homeTeamId
    if (winnerId && !placements.find((p) => p.teamId === winnerId)) {
      placements.push({ position: pos++, teamId: winnerId, team: findTeam(teams, winnerId), source: "Consolation 7th Place (15th)" })
    }
    if (loserId && !placements.find((p) => p.teamId === loserId)) {
      placements.push({ position: pos++, teamId: loserId, team: findTeam(teams, loserId), source: "Consolation 8th Place (16th)" })
    }
  } else {
    // Fallback: Fill remaining from consolation SF losers
    const consolationSFLosers = getSemiFinalLosers(consolationMatches, teams)
    for (const team of consolationSFLosers) {
      if (!placements.find((p) => p.teamId === team.id)) {
        placements.push({ position: pos++, teamId: team.id, team, source: "Consolation Bracket" })
      }
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
