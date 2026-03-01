"use client"

import { useState, useMemo, useRef } from "react"
import Link from "next/link"
import Image from "next/image"
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
import { Textarea } from "@/components/ui/textarea"
import { Play, RotateCcw, Check, Pencil, Swords, Trophy, X, Upload, ImageIcon } from "lucide-react"
import { toast } from "sonner"

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
  const [homeYellow, setHomeYellow] = useState(0)
  const [awayYellow, setAwayYellow] = useState(0)
  const [homeRed, setHomeRed] = useState(0)
  const [awayRed, setAwayRed] = useState(0)
  const [matchComment, setMatchComment] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [matchTime, setMatchTime] = useState("")
  const [matchField, setMatchField] = useState("")
  const [confirmAdvance, setConfirmAdvance] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const siteLogoInputRef = useRef<HTMLInputElement>(null)

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
    setHomeYellow(match.homeYellowCards ?? 0)
    setAwayYellow(match.awayYellowCards ?? 0)
    setHomeRed(match.homeRedCards ?? 0)
    setAwayRed(match.awayRedCards ?? 0)
    setMatchComment(match.comment ?? "")
    setMatchDate(match.matchDate ?? "")
    setMatchTime(match.matchTime ?? "")
    setMatchField(match.field ?? "")
  }

  function handleSaveScore() {
    if (!scoreDialog) return
    dispatch({
      type: "UPDATE_MATCH",
      payload: {
        tournamentId,
        matchId: scoreDialog.id,
        updates: {
          homeScore,
          awayScore,
          status: "completed" as const,
          homeYellowCards: homeYellow,
          awayYellowCards: awayYellow,
          homeRedCards: homeRed,
          awayRedCards: awayRed,
          comment: matchComment || undefined,
          matchDate: matchDate || undefined,
          matchTime: matchTime || undefined,
          field: matchField || undefined,
        },
      },
    })
    setScoreDialog(null)
  }

  function handleSaveMatchInfo() {
    if (!scoreDialog) return
    dispatch({
      type: "UPDATE_MATCH",
      payload: {
        tournamentId,
        matchId: scoreDialog.id,
        updates: {
          comment: matchComment || undefined,
          matchDate: matchDate || undefined,
          matchTime: matchTime || undefined,
          field: matchField || undefined,
          ...(scoreDialog.status === "completed" ? {
            homeScore,
            awayScore,
            homeYellowCards: homeYellow,
            awayYellowCards: awayYellow,
            homeRedCards: homeRed,
            awayRedCards: awayRed,
          } : {}),
        },
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

  async function handleLogoUpload(teamId: string, file: File) {
    setUploading(teamId)
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "team")
      formData.append("id", teamId)
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Upload failed")
        return
      }
      const { url } = await res.json()
      dispatch({
        type: "UPDATE_TEAM",
        payload: { tournamentId, teamId, updates: { logoUrl: url } },
      })
      toast.success("Logo uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(null)
    }
  }

  async function handleSiteLogoUpload(file: File) {
    setUploading("site")
    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", "site")
      formData.append("id", "site")
      const res = await fetch("/api/upload", { method: "POST", body: formData })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Upload failed")
        return
      }
      const { url } = await res.json()
      dispatch({
        type: "UPDATE_TOURNAMENT",
        payload: { id: tournamentId, updates: { siteLogo: url } },
      })
      toast.success("Site logo uploaded")
    } catch {
      toast.error("Upload failed")
    } finally {
      setUploading(null)
    }
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
          <TabsList className="mb-6 flex-wrap">
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
                            <TableHead>Logo</TableHead>
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
                                    {team.logoUrl ? (
                                      <Image src={team.logoUrl} alt={`${team.name} logo`} width={24} height={24} className="rounded object-contain" />
                                    ) : (
                                      <span className="text-xs text-muted-foreground">-</span>
                                    )}
                                  </TableCell>
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
                                  <TableCell>
                                    <div className="flex items-center gap-1">
                                      {team.logoUrl ? (
                                        <Image src={team.logoUrl} alt={`${team.name} logo`} width={24} height={24} className="rounded object-contain" />
                                      ) : (
                                        <span className="flex h-6 w-6 items-center justify-center rounded bg-secondary text-[10px] text-muted-foreground">
                                          <ImageIcon className="h-3 w-3" />
                                        </span>
                                      )}
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0"
                                        disabled={uploading === team.id}
                                        onClick={() => {
                                          const input = document.createElement("input")
                                          input.type = "file"
                                          input.accept = "image/png,image/jpeg,image/webp,image/svg+xml"
                                          input.onchange = (e) => {
                                            const f = (e.target as HTMLInputElement).files?.[0]
                                            if (f) handleLogoUpload(team.id, f)
                                          }
                                          input.click()
                                        }}
                                      >
                                        <Upload className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </TableCell>
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
                                This will lock group results and generate the knockout bracket. Top 2 teams from each group advance to the main bracket, 3rd and 4th to consolation.
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
            <div className="space-y-6">
              {/* Site Logo */}
              <Card>
                <CardHeader>
                  <CardTitle>Site Logo</CardTitle>
                  <CardDescription>Upload a logo for the tournament site (shown in the navbar)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    {tournament.siteLogo ? (
                      <Image src={tournament.siteLogo} alt="Site logo" width={48} height={48} className="rounded object-contain" />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded bg-secondary text-muted-foreground">
                        <ImageIcon className="h-6 w-6" />
                      </span>
                    )}
                    <input
                      ref={siteLogoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleSiteLogoUpload(f)
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={uploading === "site"}
                      onClick={() => siteLogoInputRef.current?.click()}
                    >
                      <Upload className="mr-1.5 h-3.5 w-3.5" />
                      {uploading === "site" ? "Uploading..." : "Upload Logo"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Tournament Settings */}
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
            </div>
          </TabsContent>
        </Tabs>

        {/* Extended Score/Match Dialog */}
        <Dialog open={!!scoreDialog} onOpenChange={(open) => !open && setScoreDialog(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit Match</DialogTitle>
              <DialogDescription>
                {scoreDialog && `${getTeamName(scoreDialog.homeTeamId)} vs ${getTeamName(scoreDialog.awayTeamId)}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Score */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Score</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1 text-center">
                    <Label className="text-xs">{scoreDialog && getTeamName(scoreDialog.homeTeamId)}</Label>
                    <Input type="number" min={0} value={homeScore} onChange={(e) => setHomeScore(Number(e.target.value))} className="text-center text-2xl font-bold h-14" />
                  </div>
                  <div className="space-y-1 text-center">
                    <Label className="text-xs">{scoreDialog && getTeamName(scoreDialog.awayTeamId)}</Label>
                    <Input type="number" min={0} value={awayScore} onChange={(e) => setAwayScore(Number(e.target.value))} className="text-center text-2xl font-bold h-14" />
                  </div>
                </div>
              </div>

              {/* Cards */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Cards</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-3 rounded-sm bg-yellow-400 shrink-0" aria-label="Yellow card" />
                      <Input type="number" min={0} value={homeYellow} onChange={(e) => setHomeYellow(Number(e.target.value))} className="h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-3 rounded-sm bg-red-500 shrink-0" aria-label="Red card" />
                      <Input type="number" min={0} value={homeRed} onChange={(e) => setHomeRed(Number(e.target.value))} className="h-8" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-3 rounded-sm bg-yellow-400 shrink-0" aria-label="Yellow card" />
                      <Input type="number" min={0} value={awayYellow} onChange={(e) => setAwayYellow(Number(e.target.value))} className="h-8" />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-4 w-3 rounded-sm bg-red-500 shrink-0" aria-label="Red card" />
                      <Input type="number" min={0} value={awayRed} onChange={(e) => setAwayRed(Number(e.target.value))} className="h-8" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Date / Time / Field */}
              <div>
                <Label className="text-xs uppercase tracking-wider text-muted-foreground mb-2 block">Schedule</Label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={matchDate} onChange={(e) => setMatchDate(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time</Label>
                    <Input type="time" value={matchTime} onChange={(e) => setMatchTime(e.target.value)} className="h-8" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Field</Label>
                    <Input type="text" value={matchField} onChange={(e) => setMatchField(e.target.value)} placeholder="Field name" className="h-8" />
                  </div>
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-1">
                <Label className="text-xs uppercase tracking-wider text-muted-foreground">Comment</Label>
                <Textarea
                  value={matchComment}
                  onChange={(e) => setMatchComment(e.target.value)}
                  placeholder="Optional comment about this match..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setScoreDialog(null)}>Cancel</Button>
              <Button variant="secondary" onClick={handleSaveMatchInfo}>Save Info Only</Button>
              <Button onClick={handleSaveScore}>Save & Complete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Hidden file inputs */}
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" />
      </div>
    </div>
  )
}
