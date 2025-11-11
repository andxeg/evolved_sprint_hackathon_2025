"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()

  const navItems = [
    { title: "Start", href: "/" },
    { title: "Jobs", href: "/jobs" }
  ]

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container relative flex h-16 items-center justify-center">
        <nav className="flex items-center space-x-8 text-base font-medium">
          {navItems.map((item) => {
            const isActive = 
              item.href === "/" 
                ? pathname === "/"
                : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground/80",
                  isActive
                    ? "text-foreground"
                    : "text-foreground/60"
                )}
              >
                {item.title}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}

