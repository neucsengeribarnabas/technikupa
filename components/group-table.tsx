"use client"

import type { Group, Team, Match } from "@/lib/types"
import { calculateGroupStandings } from "@/lib/tournament-engine"
import { TeamBadge, getGroupColors } from "@/components/team-badge"
import { cn } from "@/lib/utils"
import Link from "next/link"

interface GroupTableProps {
  group: Group
  teams: Team[]
  matches: Match[]
  tournamentId: string
  compact?: boolean
  /** Makes the group header clickable to navigate to group page */
  linkToGroup?: boolean
}

export function GroupTable({ group, teams, matches, tournamentId, compact, linkToGroup }: GroupTableProps) {
  const standings = calculateGroupStandings(group, teams, matches)
  const colors = getGroupColors(group.label)

  const headerContent = (
    <div className={cn("flex items-center gap-2 px-4 py-2.5", colors.bg, linkToGroup && "cursor-pointer hover:opacity-80 transition-opacity")}>
      <span className={cn("text-sm font-bold", colors.text)}>{group.name}</span>
    </div>
  )

  return (
    <div className="overflow-hidden rounded-lg border">
      {/* Group header */}
      {linkToGroup ? (
        <Link href={`/tournament/${tournamentId}/groups`}>
          {headerContent}
        </Link>
      ) : (
        headerContent
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">Team</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Played">P</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Won">W</th>
              {!compact && (
                <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Drawn">D</th>
              )}
              {!compact && (
                <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Lost">L</th>
              )}
              {!compact && (
                <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Goals For">GF</th>
              )}
              {!compact && (
                <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Goals Against">GA</th>
              )}
              <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Goal Difference">GD</th>
              <th className="px-3 py-2 text-center font-medium text-muted-foreground" title="Points">Pts</th>
            </tr>
          </thead>
          <tbody>
            {standings.map((s) => (
              <tr
                key={s.teamId}
                className={cn(
                  "border-b transition-colors last:border-0 hover:bg-muted/30",
                  s.qualified === "main" && "border-l-2 border-l-qualify-main",
                  s.qualified === "consolation" && "border-l-2 border-l-qualify-consolation",
                )}
              >
                <td className="px-3 py-2">
                  <Link
                    href={`/tournament/${tournamentId}/team/${s.teamId}`}
                    className="flex items-center gap-2 hover:underline"
                  >
                    {s.team.logoUrl && (
                      <img
                        src={s.team.logoUrl}
                        alt={`${s.team.abbreviation} logo`}
                        width={20}
                        height={20}
                        className="rounded object-contain"
                      />
                    )}
                    <TeamBadge abbreviation={s.team.abbreviation} groupLabel={group.label} size="sm" />
                    {!compact && <span className="font-medium">{s.team.name}</span>}
                  </Link>
                </td>
                <td className="px-3 py-2 text-center font-mono">{s.played}</td>
                <td className="px-3 py-2 text-center font-mono">{s.won}</td>
                {!compact && <td className="px-3 py-2 text-center font-mono">{s.drawn}</td>}
                {!compact && <td className="px-3 py-2 text-center font-mono">{s.lost}</td>}
                {!compact && <td className="px-3 py-2 text-center font-mono">{s.goalsFor}</td>}
                {!compact && <td className="px-3 py-2 text-center font-mono">{s.goalsAgainst}</td>}
                <td className="px-3 py-2 text-center font-mono">
                  <span
                    className={cn(
                      s.goalDifference > 0 && "text-accent",
                      s.goalDifference < 0 && "text-destructive-foreground",
                    )}
                  >
                    {s.goalDifference > 0 ? `+${s.goalDifference}` : s.goalDifference}
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="font-mono font-bold">{s.points}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex items-center gap-4 border-t px-4 py-2 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-qualify-main" />
            Advances to Main Bracket
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-qualify-consolation" />
            Consolation Bracket
          </span>
        </div>
      )}
    </div>
  )
}
