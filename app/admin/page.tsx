"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useTournament } from "@/lib/tournament-context"
import { calculateGroupStandings, generateMainBracketSeeding, generateConsolationBracketSeeding, generateBracketMatches, getRoundLabel } from "@/lib/tournament-engine"
import type { Match, GroupStanding } from "@/lib/types"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Play, RotateCcw, Check, Pencil, Swords, Trophy, AlertTriangle, X } from "lucide-react"

export default function AdminPage() {
  const { tournament, dispatch, reset } = useTournament()
  const tournamentId = tournament.id

  const [editTeamId, setEditTeamId] = useState<string | null>(null)
  const [editTeamName, setEditTeamName] = useState("")
  const [editTeamAbbr, setEditTeamAbbr] = useState("")
  const [editTournamentName, setEditTournamentName] = useState(false)
  const [tournamentName, setTournamentName] = useState(tournament.name)
  const [scoreDialog, setScoreDialog] = useState<Match | null>(null)
  const [homeScore, setHomeScore] = useState(0)
  const [awayScore, setAwayScore] = useState(0)
  const [confirmAdvance, setConfirmAdvance] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)

  const groupStandings = useMemo(() => {
    return tournament.groups.map((g) => ({
      group: g,
      standings: calculateGroupStandings(g, tournament.teams, tournament.matches),
    }))
  }, [tournament])

  const groupMatches = tournament.matches.filter((m) => m.stage === "group")
  const bracketMatches = tournament.matches.filter((m) => m.stage === "main" || m.stage === "consolation")
  const allGroupMatchesPlayed = groupMatches.length > 0 && groupMatches.every((m) => m.status === "completed")
  const canGenerateGroupMatches = groupMatches.length === 0 && tournament.groups.length > 0 && tournament.groups.every((g) => g.teamIds.length >= 2)

  function generateGroupMatchesForTournament() {
    const matches: Match[] = []
    let matchCounter = 0
    for (const group of tournament.groups) {
      const teamIds = group.teamIds
      let matchday = 1
      for (let i = 0; i < teamIds.length; i++) {
        for (let j = i + 1; j < teamIds.length; j++) {
          matches.push({
            id: `${tournamentId}-gm-${matchCounter++}`,
            tournamentId,
            stage: "group",
            groupId: group.id,
            homeTeamId: teamIds[i],
            awayTeamId: teamIds[j],
            homeScore: null,
            awayScore: null,
            status: "scheduled",
            matchday,
          })
          if (matchCounter % 2 === 0) matchday++
        }
      }
    }
    matches.forEach((m) =>
      dispatch({ type: "ADD_MATCH", payload: { tournamentId, match: m } }),
    )
    if (tournament.status === "draft") {
      dispatch({
        type: "UPDATE_TOURNAMENT",
        payload: { id: tournamentId, updates: { status: "group_stage" } },
      })
    }
  }

  function handleAdvanceToKnockout() {
    const allStandings = new Map<string, GroupStanding[]>()
    groupStandings.forEach((gs) => {
      allStandings.set(gs.group.id, gs.standings)
    })

    const mainSeeds = generateMainBracketSeeding(tournament.groups, allStandings)
    const consolationSeeds = generateConsolationBracketSeeding(tournament.groups, allStandings)

    const mainMatches = generateBracketMatches(tournamentId, mainSeeds, "main", 1000)
    const consolationMatchesGenerated = generateBracketMatches(tournamentId, consolationSeeds, "consolation", 2000)

    mainMatches.forEach((m) =>
      dispatch({ type: "ADD_MATCH", payload: { tournamentId, match: m } }),
    )
    consolationMatchesGenerated.forEach((m) =>
      dispatch({ type: "ADD_MATCH", payload: { tournamentId, match: m } }),
    )
    dispatch({
      type: "UPDATE_TOURNAMENT",
      payload: { id: tournamentId, updates: { status: "bracket_stage", groupStageLocked: true } },
    })
    setConfirmAdvance(false)
  }

  function openScoreDialog(match: Match) {
    setScoreDialog(match)
    setHomeScore(match.homeScore ?? 0)
    setAwayScore(match.awayScore ?? 0)
  }

  function handleSaveScore() {
    if (!scoreDialog) return
    dispatch({
      type: "UPDATE_MATCH",
      payload: {
        tournamentId,
        matchId: scoreDialog.id,
        updates: { homeScore, awayScore, status: "completed" as const },
      },
    })
    setScoreDialog(null)
  }

  function handleResetMatch(matchId: string) {
    dispatch({
      type: "UPDATE_MATCH",
      payload: {
        tournamentId,
        matchId,
        updates: { homeScore: null, awayScore: null, status: "scheduled" as const },
      },
    })
  }

  function startEditTeam(teamId: string) {
    const team = tournament.teams.find((t) => t.id === teamId)
    if (team) {
      setEditTeamId(teamId)
      setEditTeamName(team.name)
      setEditTeamAbbr(team.abbreviation)
    }
  }

  function saveEditTeam() {
    if (!editTeamId) return
    dispatch({
      type: "UPDATE_TEAM",
      payload: {
        tournamentId,
        teamId: editTeamId,
        updates: { name: editTeamName.trim() || "Unnamed", abbreviation: editTeamAbbr.trim() || "UNK" },
      },
    })
    setEditTeamId(null)
  }

  function cancelEditTeam() {
    setEditTeamId(null)
    setEditTeamName("")
    setEditTeamAbbr("")
  }

  function saveTournamentName() {
    dispatch({
      type: "UPDATE_TOURNAMENT",
      payload: { id: tournamentId, updates: { name: tournamentName.trim() || "My Tournament" } },
    })
    setEditTournamentName(false)
  }

  function getTeamName(id: string | null) {
    if (!id) return "TBD"
    return tournament.teams.find((t) => t.id === id)?.name ?? "TBD"
  }

  const statusLabel =
    tournament.status === "group_stage"
      ? "Group Stage"
      : tournament.status === "bracket_stage"
        ? "Bracket Stage"
        : tournament.status === "completed"
          ? "Completed"
          : "Draft"

  const mainBracketMatches = bracketMatches.filter((m) => m.stage === "main")
  const consolationBracketMatches = bracketMatches.filter((m) => m.stage === "consolation")

  function renderBracketRound(roundMatches: Match[], label: string) {
    if (roundMatches.length === 0) return null
    return (
      <Card key={label}>
        <CardHeader>
          <CardTitle className="text-lg">{label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {roundMatches.map((match) => (
              <div key={match.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                <div className="flex-1 flex items-center gap-2">
                  <span className={`text-sm font-medium ${match.status === "completed" && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore ? "text-primary" : "text-foreground"}`}>
                    {getTeamName(match.homeTeamId)}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {match.status === "completed" ? (
                    <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                      {match.homeScore} - {match.awayScore}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground">vs</span>
                  )}
                </div>
                <div className="flex-1 flex items-center justify-end gap-2">
                  <span className={`text-sm font-medium ${match.status === "completed" && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore ? "text-primary" : "text-foreground"}`}>
                    {getTeamName(match.awayTeamId)}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  {match.homeTeamId && match.awayTeamId && (
                    <Button variant="ghost" size="sm" onClick={() => openScoreDialog(match)}>
                      <Swords className="h-4 w-4" />
                    </Button>
                  )}
                  {match.status === "completed" && (
                    <Button variant="ghost" size="sm" onClick={() => handleResetMatch(match.id)}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  function renderBracketSection(stageMatches: Match[], stageTitle: string) {
    if (stageMatches.length === 0) return null
    const rounds = new Map<number, Match[]>()
    const thirdPlaceMatches: Match[] = []
    stageMatches.forEach((m) => {
      if (m.id.includes("3rd")) {
        thirdPlaceMatches.push(m)
      } else {
        const round = m.bracketRound ?? 0
        if (!rounds.has(round)) rounds.set(round, [])
        rounds.get(round)!.push(m)
      }
    })
    const totalRounds = rounds.size > 0 ? Math.max(...Array.from(rounds.keys())) + 1 : 0

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-foreground">{stageTitle}</h3>
        {Array.from(rounds.entries())
          .sort(([a], [b]) => a - b)
          .map(([round, matches]) => renderBracketRound(matches, getRoundLabel(round, totalRounds)))}
        {thirdPlaceMatches.length > 0 && renderBracketRound(thirdPlaceMatches, "3rd Place Match")}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col gap-2 mb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {editTournamentName ? (
              <div className="flex items-center gap-2">
                <Input
                  value={tournamentName}
                  onChange={(e) => setTournamentName(e.target.value)}
                  className="text-2xl font-bold h-10 max-w-md"
                  onKeyDown={(e) => e.key === "Enter" && saveTournamentName()}
                  autoFocus
                />
                <Button variant="ghost" size="sm" onClick={saveTournamentName}>
                  <Check className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setEditTournamentName(false); setTournamentName(tournament.name) }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-foreground">{tournament.name}</h1>
                <Button variant="ghost" size="sm" onClick={() => { setEditTournamentName(true); setTournamentName(tournament.name) }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={tournament.status === "completed" ? "default" : tournament.status === "draft" ? "outline" : "secondary"}>
                {statusLabel}
              </Badge>
              {tournament.groupStageLocked && <Badge variant="outline">Groups Locked</Badge>}
            </div>
          </div>
          <Link href={`/tournament/${tournament.id}`}>
            <Button variant="outline">View Public Page</Button>
          </Link>
        </div>

        <Tabs defaultValue="teams">
          <TabsList className="mb-6">
            <TabsTrigger value="teams">Teams & Groups</TabsTrigger>
            <TabsTrigger value="group-matches">Group Matches</TabsTrigger>
            <TabsTrigger value="knockout">Knockout</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Teams & Groups Tab */}
          <TabsContent value="teams">
            <div className="grid gap-6">
              {tournament.groups.map((group) => {
                const teams = tournament.teams.filter((t) => t.groupId === group.id)
                return (
                  <Card key={group.id}>
                    <CardHeader>
                      <CardTitle className="text-lg">{group.name}</CardTitle>
                      <CardDescription>{teams.length} teams</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Abbr</TableHead>
                            <TableHead>Team Name</TableHead>
                            <TableHead>Group</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {teams.map((team) => (
                            <TableRow key={team.id}>
                              {editTeamId === team.id ? (
                                <>
                                  <TableCell>
                                    <Input
                                      value={editTeamAbbr}
                                      onChange={(e) => setEditTeamAbbr(e.target.value)}
                                      className="h-8 w-20"
                                      onKeyDown={(e) => e.key === "Enter" && saveEditTeam()}
                                    />
                                  </TableCell>
                                  <TableCell>
                                    <Input
                                      value={editTeamName}
                                      onChange={(e) => setEditTeamName(e.target.value)}
                                      className="h-8"
                                      onKeyDown={(e) => e.key === "Enter" && saveEditTeam()}
                                      autoFocus
                                    />
                                  </TableCell>
                                  <TableCell className="text-muted-foreground">{group.label}</TableCell>
                                  <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                      <Button variant="ghost" size="sm" onClick={saveEditTeam}>
                                        <Check className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={cancelEditTeam}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </>
                              ) : (
                                <>
                                  <TableCell className="font-mono text-muted-foreground">{team.abbreviation}</TableCell>
                                  <TableCell className="font-medium text-foreground">{team.name}</TableCell>
                                  <TableCell className="text-muted-foreground">{group.label}</TableCell>
                                  <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" onClick={() => startEditTeam(team.id)}>
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          {/* Group Matches Tab */}
          <TabsContent value="group-matches">
            <div className="space-y-6">
              {canGenerateGroupMatches && (
                <Card>
                  <CardContent className="flex items-center justify-between py-6">
                    <div>
                      <h3 className="font-semibold text-foreground">Generate Group Stage Fixtures</h3>
                      <p className="text-sm text-muted-foreground">Create round-robin matches for all groups.</p>
                    </div>
                    <Button onClick={generateGroupMatchesForTournament}>
                      <Play className="mr-2 h-4 w-4" />
                      Generate Matches
                    </Button>
                  </CardContent>
                </Card>
              )}

              {groupMatches.length > 0 && (
                <>
                  {allGroupMatchesPlayed && bracketMatches.length === 0 && (
                    <Card className="border-primary/50">
                      <CardContent className="flex items-center justify-between py-6">
                        <div>
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-primary" />
                            All group matches complete!
                          </h3>
                          <p className="text-sm text-muted-foreground">Ready to advance to the knockout stage.</p>
                        </div>
                        <Dialog open={confirmAdvance} onOpenChange={setConfirmAdvance}>
                          <DialogTrigger asChild>
                            <Button>Advance to Knockout</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Advance to Knockout Stage?</DialogTitle>
                              <DialogDescription>
                                This will lock group results and generate the knockout bracket. Top 2 teams from each group advance to the main bracket, bottom 2 to consolation.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-3 my-4">
                              {groupStandings.map((gs) => (
                                <div key={gs.group.id}>
                                  <h4 className="text-sm font-medium text-foreground mb-1">{gs.group.name}</h4>
                                  <div className="flex flex-wrap gap-2">
                                    {gs.standings.map((s, i) => (
                                      <Badge key={s.teamId} variant={i < 2 ? "default" : "outline"}>
                                        {i + 1}. {getTeamName(s.teamId)}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setConfirmAdvance(false)}>Cancel</Button>
                              <Button onClick={handleAdvanceToKnockout}>Confirm & Generate Bracket</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  )}

                  {tournament.groups.map((group) => {
                    const gMatches = groupMatches.filter((m) => m.groupId === group.id)
                    if (gMatches.length === 0) return null
                    return (
                      <Card key={group.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{group.name} Matches</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            {gMatches.map((match) => (
                              <div key={match.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                                <div className="flex-1 flex items-center gap-2">
                                  <span className={`text-sm font-medium ${match.status === "completed" && match.homeScore !== null && match.awayScore !== null && match.homeScore > match.awayScore ? "text-primary" : "text-foreground"}`}>
                                    {getTeamName(match.homeTeamId)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {match.status === "completed" ? (
                                    <span className="font-mono text-lg font-bold text-foreground tabular-nums">
                                      {match.homeScore} - {match.awayScore}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-muted-foreground">vs</span>
                                  )}
                                </div>
                                <div className="flex-1 flex items-center justify-end gap-2">
                                  <span className={`text-sm font-medium ${match.status === "completed" && match.homeScore !== null && match.awayScore !== null && match.awayScore > match.homeScore ? "text-primary" : "text-foreground"}`}>
                                    {getTeamName(match.awayTeamId)}
                                  </span>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  {!tournament.groupStageLocked && (
                                    <Button variant="ghost" size="sm" onClick={() => openScoreDialog(match)}>
                                      <Swords className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {match.status === "completed" && !tournament.groupStageLocked && (
                                    <Button variant="ghost" size="sm" onClick={() => handleResetMatch(match.id)}>
                                      <RotateCcw className="h-4 w-4" />
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </>
              )}

              {groupMatches.length === 0 && !canGenerateGroupMatches && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Add at least 2 teams per group to generate matches.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Knockout Tab */}
          <TabsContent value="knockout">
            {bracketMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Knockout stage not started</h3>
                  <p className="text-muted-foreground">Complete all group matches first, then advance to the knockout stage.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-8">
                {renderBracketSection(mainBracketMatches, "Championship Bracket")}
                {renderBracketSection(consolationBracketMatches, "Consolation Bracket")}
              </div>
            )}
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Tournament Settings</CardTitle>
                <CardDescription>View tournament details and manage settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Teams</Label>
                    <p className="text-sm text-foreground">{tournament.teams.length}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Groups</Label>
                    <p className="text-sm text-foreground">{tournament.groups.length}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Matches</Label>
                    <p className="text-sm text-foreground">{tournament.matches.length}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <p className="text-sm text-foreground">{statusLabel}</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Groups Locked</Label>
                    <p className="text-sm text-foreground">{tournament.groupStageLocked ? "Yes" : "No"}</p>
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <h4 className="text-sm font-medium text-foreground mb-3">Danger Zone</h4>
                  <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
                    <DialogTrigger asChild>
                      <Button variant="destructive" size="sm">Reset Tournament</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Reset Tournament?</DialogTitle>
                        <DialogDescription>This will delete all teams, matches, and scores and start fresh with a blank tournament. This action cannot be undone.</DialogDescription>
                      </DialogHeader>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmReset(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => { reset(); setConfirmReset(false) }}>Reset Everything</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Score Dialog */}
        <Dialog open={!!scoreDialog} onOpenChange={(open) => !open && setScoreDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enter Score</DialogTitle>
              <DialogDescription>
                {scoreDialog && `${getTeamName(scoreDialog.homeTeamId)} vs ${getTeamName(scoreDialog.awayTeamId)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-6 py-4">
              <div className="space-y-2 text-center">
                <Label>{scoreDialog && getTeamName(scoreDialog.homeTeamId)}</Label>
                <Input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="text-center text-2xl font-bold h-14" />
              </div>
              <div className="space-y-2 text-center">
                <Label>{scoreDialog && getTeamName(scoreDialog.awayTeamId)}</Label>
                <Input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="text-center text-2xl font-bold h-14" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setScoreDialog(null)}>Cancel</Button>
              <Button onClick={handleSaveScore}>Save Score</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
