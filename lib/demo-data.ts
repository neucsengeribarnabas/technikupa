import type { Tournament, Team, Group } from "./types"

// ── Empty single-tournament setup ─────────────────────

function createBlankTournament(): Tournament {
  const teams: Team[] = []
  const groups: Group[] = []
  const groupLabels = ["A", "B", "C", "D"]

  for (let g = 0; g < 4; g++) {
    const groupId = `group-${groupLabels[g].toLowerCase()}`
    const groupTeamIds: string[] = []

    for (let t = 0; t < 4; t++) {
      const teamIdx = g * 4 + t + 1
      const teamId = `team-${teamIdx}`
      teams.push({
        id: teamId,
        name: `Team ${teamIdx}`,
        abbreviation: `T${teamIdx.toString().padStart(2, "0")}`,
        groupId,
      })
      groupTeamIds.push(teamId)
    }

    groups.push({
      id: groupId,
      name: `Group ${groupLabels[g]}`,
      label: groupLabels[g],
      teamIds: groupTeamIds,
    })
  }

  const now = new Date().toISOString()

  return {
    id: "tournament",
    name: "My Tournament",
    description: "",
    status: "draft",
    groups,
    teams,
    matches: [],
    createdAt: now,
    updatedAt: now,
    groupStageLocked: false,
    bracketStageLocked: false,
  }
}

export function createInitialState() {
  return {
    tournaments: [createBlankTournament()],
    activeTournamentId: "tournament",
  }
}
