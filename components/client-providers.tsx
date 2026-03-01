"use client"

import type { ReactNode } from "react"
import { TournamentProvider } from "@/lib/tournament-context"
import { NavBar } from "@/components/nav-bar"
import { Toaster } from "sonner"

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <TournamentProvider>
      <div className="flex min-h-screen flex-col">
        <NavBar />
        <main className="flex-1">{children}</main>
      </div>
      <Toaster position="bottom-right" richColors />
    </TournamentProvider>
  )
}
