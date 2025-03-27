"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ConnectKitButton } from "connectkit"
import { cn } from "@/lib/utils"

export function Header() {
  const pathname = usePathname()

  const navItems = [
    { name: "Swap", href: "/" },
    { name: "Pool", href: "/pool" },
  ]

  return (
    <header className="glass-effect py-4 mb-6">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-8">
          <Link
            href="/"
            className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-blue-800"
          >
            UniswapV2
          </Link>
          <nav className="hidden md:flex items-center space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-blue-600",
                  pathname === item.href ? "text-blue-600 font-semibold" : "text-gray-600",
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <ConnectKitButton />
      </div>
    </header>
  )
}

