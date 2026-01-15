"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Ticket, LogOut, PlusCircle, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/components/layout/header"

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const navItems = [
        {
            href: "/portal/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            exact: true
        },
        // We can add a dedicated "My Tickets" list page later if needed, 
        // for now Dashboard acts as the list.
        {
            href: "/portal/tickets/new",
            label: "Novo Ticket",
            icon: PlusCircle,
            exact: false,
            highlight: true // Special visual treatment
        },
        {
            href: "/portal/profile",
            label: "Meus Dados",
            icon: User,
            exact: true
        }
    ]

    return (
        <div className="flex min-h-screen bg-zinc-50">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0C0C0C] text-zinc-400 flex flex-col fixed h-full inset-y-0 z-50">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                    <span className="text-xl font-bold tracking-tight text-white">
                        GRAVTAH
                    </span>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2">
                    {navItems.map((item) => {
                        const isActive = item.exact
                            ? pathname === item.href
                            : pathname.startsWith(item.href)

                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                                    isActive
                                        ? "bg-zinc-800 text-white"
                                        : "hover:bg-zinc-800/50 hover:text-white",
                                    item.highlight && !isActive && "text-white hover:bg-zinc-800"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5", item.highlight && "text-white")} />
                                <span className="font-medium text-sm uppercase tracking-wide">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
                    {/* In a real app, this would trigger a signOut function */}
                    <Link href="/login" className="flex items-center gap-3 px-4 py-3 hover:text-white transition-colors">
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium text-sm uppercase tracking-wide">Sair</span>
                    </Link>
                </div>
            </aside>

            {/* Main Content Wrapper */}
            <div className="flex-1 ml-64 flex flex-col h-full overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-8 bg-zinc-50">
                    <div className="max-w-5xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
