"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Ticket, Users, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Header } from "@/components/layout/header"

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()

    const navItems = [
        {
            href: "/admin/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            exact: true
        },
        {
            href: "/admin/tickets",
            label: "Tickets",
            icon: Ticket,
            exact: false
        },
        {
            href: "/admin/customers",
            label: "Clientes",
            icon: Users,
            exact: false
        }
    ]

    return (
        <div className="flex min-h-screen bg-zinc-100">
            {/* Sidebar */}
            <aside className="w-64 bg-[#0C0C0C] text-zinc-400 flex flex-col fixed h-full inset-y-0 z-50">
                <div className="h-16 flex items-center px-6 border-b border-zinc-800">
                    <span className="text-xl font-bold tracking-tight text-white">
                        GRAVTAH <span className="text-zinc-600 text-sm">ADMIN</span>
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
                                        : "hover:bg-zinc-800/50 hover:text-white"
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                <span className="font-medium text-sm uppercase tracking-wide">
                                    {item.label}
                                </span>
                            </Link>
                        )
                    })}
                </nav>

                <div className="p-4 border-t border-zinc-800">
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
                    <div className="max-w-6xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
