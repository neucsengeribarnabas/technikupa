// ── Enums ──────────────────────────────────────────────

export type TournamentStatus = "draft" | "group_stage" | "bracket_stage" | "completed"
export type MatchStage = "group" | "main" | "consolation"
export type MatchStatus = "scheduled" | "in_progress" | "completed"

// ── Core entities ──────────────────────────────────────

export interface Team {
  id: string
  name: string
  abbreviation: string
  groupId: string
  seed?: number
  flagCode?: string // ISO 3166 alpha-2 for flag display
  logoUrl?: string  // path to uploaded logo image
}

export interface Group {
  id: string
  name: string // e.g. "Group A"
  label: string // e.g. "A"
  teamIds: string[]
}

export interface Match {
  id: string
  tournamentId: string
  stage: MatchStage
  groupId?: string // only for group stage matches
  bracketRound?: number // 0-indexed round in bracket
  bracketPosition?: number // position within the round
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number | null
  awayScore: number | null
  status: MatchStatus
  // Fair play cards (for tie-breaking)
  homeYellowCards?: number
  awayYellowCards?: number
  homeRedCards?: number
  awayRedCards?: number
  // Metadata
  matchday?: number
  comment?: string        // free text comment
  matchDate?: string      // ISO date string (YYYY-MM-DD)
  matchTime?: string      // time string (HH:MM)
  field?: string          // field/venue name
  nextMatchId?: string | null // id of the match the winner advances to
  nextMatchSlot?: "home" | "away" // which slot in the next match
}

export interface Tournament {
  id: string
  name: string
  description?: string
  status: TournamentStatus
  groups: Group[]
  teams: Team[]
  matches: Match[]
  createdAt: string
  updatedAt: string
  groupStageLocked: boolean
  bracketStageLocked: boolean
  siteLogo?: string // path to site logo image
}

// ── Computed / derived ────────────────────────────────

export interface GroupStanding {
  teamId: string
  team: Team
  played: number
  won: number
  drawn: number
  lost: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  fairPlayScore: number
  rank: number
  qualified: "main" | "consolation" | null
}

export interface BracketSlot {
  matchId: string
  match: Match
  round: number
  position: number
  homeTeam: Team | null
  awayTeam: Team | null
}

// ── State shape ───────────────────────────────────────

export interface TournamentState {
  tournaments: Tournament[]
  activeTournamentId: string | null
}
