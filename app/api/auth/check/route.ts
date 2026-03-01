import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

export async function GET(req: NextRequest) {
  const token = req.cookies.get("admin-session")?.value
  const secret = process.env.ADMIN_SECRET

  if (!token || !secret) {
    return NextResponse.json({ authenticated: false })
  }

  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
    return NextResponse.json({ authenticated: true })
  } catch {
    return NextResponse.json({ authenticated: false })
  }
}
