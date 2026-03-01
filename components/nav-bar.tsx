"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Trophy, LayoutDashboard, Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTournament } from "@/lib/tournament-context"
import { cn } from "@/lib/utils"
import { useState } from "react"

export function NavBar() {
  const pathname = usePathname()
  const { tournament } = useTournament()
  const isAdmin = pathname.startsWith("/admin")
  const [mobileOpen, setMobileOpen] = useState(false)

  const tid = tournament.id

  const publicLinks = [
    { href: "/", label: "Home" },
    { href: `/tournament/${tid}`, label: "Overview" },
    { href: `/tournament/${tid}/groups`, label: "Groups" },
    { href: `/tournament/${tid}/bracket`, label: "Bracket" },
    { href: `/tournament/${tid}/standings`, label: "Standings" },
  ]

  const adminLinks = [
    { href: "/admin", label: "Manage" },
  ]

  const links = isAdmin ? adminLinks : publicLinks

  return (
    <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <span className="text-sm font-bold tracking-tight">
            {tournament.name}
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex" role="navigation" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                pathname === link.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <Link href={isAdmin ? "/" : "/admin"}>
            <Button variant="outline" size="sm" className="hidden md:flex">
              <LayoutDashboard className="mr-1.5 h-3.5 w-3.5" />
              {isAdmin ? "Public View" : "Admin"}
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle navigation menu"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <nav className="border-t bg-card px-4 pb-4 pt-2 md:hidden" role="navigation" aria-label="Mobile navigation">
          <div className="flex flex-col gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  pathname === link.href
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="my-2 h-px bg-border" role="separator" />
            <Link
              href={isAdmin ? "/" : "/admin"}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <LayoutDashboard className="h-3.5 w-3.5" />
              {isAdmin ? "Public View" : "Admin Panel"}
            </Link>
          </div>
        </nav>
      )}
    </header>
  )
}
