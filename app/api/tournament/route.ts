import { NextResponse } from "next/server"
import { readTournamentData, writeTournamentData } from "@/lib/storage"

export async function GET() {
  try {
    const data = readTournamentData()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to read tournament data:", error)
    return NextResponse.json({ error: "Failed to read data" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    writeTournamentData(body)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Failed to write tournament data:", error)
    return NextResponse.json({ error: "Failed to write data" }, { status: 500 })
  }
}
