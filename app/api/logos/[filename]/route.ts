import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { existsSync } from "fs"
import path from "path"

const MIME_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  svg: "image/svg+xml",
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params

  // Sanitize filename to prevent directory traversal
  const sanitized = path.basename(filename)
  const filePath = path.join(process.cwd(), "data", "logos", sanitized)

  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const ext = sanitized.split(".").pop()?.toLowerCase() || "png"
  const contentType = MIME_TYPES[ext] || "application/octet-stream"

  const buffer = await readFile(filePath)

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}
