"use client"

import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useRef,
  useState,
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
          // and send losers to placement matches (3rd, 5th, 7th place)
          const updatedMatch = updatedMatches.find((m) => m.id === action.payload.matchId)
          if (
            updatedMatch &&
            updatedMatch.status === "completed" &&
            updatedMatch.homeScore != null &&
            updatedMatch.awayScore != null &&
            (updatedMatch.stage === "main" || updatedMatch.stage === "consolation")
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

export function TournamentProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(tournamentReducer, createInitialState())
  const [loaded, setLoaded] = useState(false)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isInitialLoad = useRef(true)

  // Load from server on mount
  useEffect(() => {
    fetch("/api/tournament")
      .then((res) => res.json())
      .then((data: TournamentState) => {
        if (data.tournaments && data.tournaments.length > 0) {
          dispatch({ type: "LOAD_STATE", payload: data })
        }
        isInitialLoad.current = false
        setLoaded(true)
      })
      .catch(() => {
        isInitialLoad.current = false
        setLoaded(true)
      })
  }, [])

  // Persist to server on state change (debounced, skip initial load)
  useEffect(() => {
    if (!loaded || isInitialLoad.current) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      fetch("/api/tournament", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }).catch(() => {
        // Silent fail on persist
      })
    }, 300)
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current)
    }
  }, [state, loaded])

  const tournament = state.tournaments[0]

  const reset = useCallback(() => {
    dispatch({ type: "RESET" })
  }, [])

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-muted-foreground text-sm">Loading tournament data...</div>
      </div>
    )
  }

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
