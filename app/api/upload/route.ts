import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import path from "path"
import { jwtVerify } from "jose"

export async function POST(req: NextRequest) {
  // Verify admin session
  const token = req.cookies.get("admin-session")?.value
  const secret = process.env.ADMIN_SECRET
  if (!token || !secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    await jwtVerify(token, new TextEncoder().encode(secret))
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const type = formData.get("type") as string | null // "team" or "site"
  const id = formData.get("id") as string | null // team id or "site"

  if (!file || !type || !id) {
    return NextResponse.json({ error: "Missing file, type, or id" }, { status: 400 })
  }

  // Validate file type
  const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"]
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json({ error: "Invalid file type. Use PNG, JPG, WebP, or SVG." }, { status: 400 })
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 })
  }

  const ext = file.name.split(".").pop() || "png"
  const filename = type === "site" ? `site-logo.${ext}` : `${id}.${ext}`
  const dir = path.join(process.cwd(), "data", "logos")

  await mkdir(dir, { recursive: true })

  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const filePath = path.join(dir, filename)
  await writeFile(filePath, buffer)

  const publicPath = `/api/logos/${filename}`
  return NextResponse.json({ url: publicPath })
}
