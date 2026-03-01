"use client"

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from "react"
import type { Tournament, TournamentState, Match, Team, Group } from "./types"
import { createInitialState } from "./demo-data"
import { advanceBracketWinner } from "./tournament-engine"

// ── Actions ───────────────────────────────────────────

type Action =
  | { type: "LOAD_STATE"; payload: TournamentState }
  | { type: "UPDATE_TOURNAMENT"; payload: { id: string; updates: Partial<Tournament> } }
  | { type: "ADD_TEAM"; payload: { tournamentId: string; team: Team } }
  | { type: "UPDATE_TEAM"; payload: { tournamentId: string; teamId: string; updates: Partial<Team> } }
  | { type: "DELETE_TEAM"; payload: { tournamentId: string; teamId: string } }
  | { type: "ADD_GROUP"; payload: { tournamentId: string; group: Group } }
  | { type: "UPDATE_GROUP"; payload: { tournamentId: string; groupId: string; updates: Partial<Group> } }
  | { type: "DELETE_GROUP"; payload: { tournamentId: string; groupId: string } }
  | { type: "UPDATE_MATCH"; payload: { tournamentId: string; matchId: string; updates: Partial<Match> } }
  | { type: "ADD_MATCH"; payload: { tournamentId: string; match: Match } }
  | { type: "RESET" }

// ── Reducer ───────────────────────────────────────────

function tournamentReducer(state: TournamentState, action: Action): TournamentState {
  switch (action.type) {
    case "LOAD_STATE":
      return action.payload

    case "UPDATE_TOURNAMENT":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.id
            ? { ...t, ...action.payload.updates, updatedAt: new Date().toISOString() }
            : t,
        ),
      }

    case "ADD_TEAM":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? { ...t, teams: [...t.teams, action.payload.team], updatedAt: new Date().toISOString() }
            : t,
        ),
      }

    case "UPDATE_TEAM":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? {
                ...t,
                teams: t.teams.map((team) =>
                  team.id === action.payload.teamId ? { ...team, ...action.payload.updates } : team,
                ),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }

    case "DELETE_TEAM":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? {
                ...t,
                teams: t.teams.filter((team) => team.id !== action.payload.teamId),
                groups: t.groups.map((g) => ({
                  ...g,
                  teamIds: g.teamIds.filter((id) => id !== action.payload.teamId),
                })),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }

    case "ADD_GROUP":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? { ...t, groups: [...t.groups, action.payload.group], updatedAt: new Date().toISOString() }
            : t,
        ),
      }

    case "UPDATE_GROUP":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? {
                ...t,
                groups: t.groups.map((g) =>
                  g.id === action.payload.groupId ? { ...g, ...action.payload.updates } : g,
                ),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }

    case "DELETE_GROUP":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? {
                ...t,
                groups: t.groups.filter((g) => g.id !== action.payload.groupId),
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      }

    case "UPDATE_MATCH": {
      return {
        ...state,
        tournaments: state.tournaments.map((t) => {
          if (t.id !== action.payload.tournamentId) return t
          let updatedMatches = t.matches.map((m) =>
            m.id === action.payload.matchId ? { ...m, ...action.payload.updates } : m,
          )
          // If the match now has a completed score, advance the winner in the bracket
          const updatedMatch = updatedMatches.find((m) => m.id === action.payload.matchId)
          if (
            updatedMatch &&
            updatedMatch.status === "completed" &&
            updatedMatch.homeScore != null &&
            updatedMatch.awayScore != null &&
            updatedMatch.nextMatchId
          ) {
            updatedMatches = advanceBracketWinner(updatedMatches, action.payload.matchId)
          }
          return { ...t, matches: updatedMatches, updatedAt: new Date().toISOString() }
        }),
      }
    }

    case "ADD_MATCH":
      return {
        ...state,
        tournaments: state.tournaments.map((t) =>
          t.id === action.payload.tournamentId
            ? { ...t, matches: [...t.matches, action.payload.match], updatedAt: new Date().toISOString() }
            : t,
        ),
      }

    case "RESET":
      return createInitialState()

    default:
      return state
  }
}

// ── Context ───────────────────────────────────────────

interface TournamentContextValue {
  state: TournamentState
  tournament: Tournament
  dispatch: React.Dispatch<Action>
  reset: () => void
}

const TournamentContext = createContext<TournamentContextValue | null>(null)

const STORAGE_KEY = "tournament-app-state"

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, createInitialState())

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as TournamentState
        if (parsed.tournaments && parsed.tournaments.length > 0) {
          dispatch({ type: "LOAD_STATE", payload: parsed })
        }
      }
    } catch {
      // If parsing fails, keep the blank state
    }
  }, [])

  // Persist to localStorage on every state change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      // localStorage might be full or unavailable
    }
  }, [state])

  const tournament = state.tournaments[0]

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY)
    dispatch({ type: "RESET" })
  }, [])

  return (
    <TournamentContext.Provider
      value={{ state, tournament, dispatch, reset }}
    >
      {children}
    </TournamentContext.Provider>
  )
}

export function useTournament() {
  const ctx = useContext(TournamentContext)
  if (!ctx) throw new Error("useTournament must be used within a TournamentProvider")
  return ctx
}
