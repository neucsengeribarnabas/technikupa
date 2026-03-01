import fs from "fs"
import path from "path"
import type { TournamentState } from "./types"
import { createInitialState } from "./demo-data"

const DATA_DIR = path.join(process.cwd(), "data")
const DATA_FILE = path.join(DATA_DIR, "tournament.json")

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }
}

export function readTournamentData(): TournamentState {
  ensureDataDir()
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, "utf-8")
      const parsed = JSON.parse(raw) as TournamentState
      if (parsed.tournaments && parsed.tournaments.length > 0) {
        return parsed
      }
    }
  } catch {
    // If parsing fails, return initial state
  }
  // Create the file with initial state if it doesn't exist
  const initial = createInitialState()
  fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2), "utf-8")
  return initial
}

export function writeTournamentData(state: TournamentState): void {
  ensureDataDir()
  fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), "utf-8")
}
