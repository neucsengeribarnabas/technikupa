import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json()

    const adminUsername = process.env.ADMIN_USERNAME
    const adminPassword = process.env.ADMIN_PASSWORD
    const secret = process.env.ADMIN_SECRET

    if (!adminUsername || !adminPassword || !secret) {
      return NextResponse.json({ error: "Server not configured" }, { status: 500 })
    }

    if (username !== adminUsername || password !== adminPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await new SignJWT({ role: "admin" })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("24h")
      .setIssuedAt()
      .sign(new TextEncoder().encode(secret))

    const response = NextResponse.json({ success: true })
    response.cookies.set("admin-session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/",
    })

    return response
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 })
  }
}
