"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Ticket, LogOut, PlusCircle, User, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
// import { Header } from "@/components/layout/header" // Removed double header usage if present or integrate properly
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { Button } from "@/components/ui/button"

export default function PortalLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const pathname = usePathname()
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

    const navItems = [
        {
            href: "/portal/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
            exact: true
        },
        {
            href: "/portal/tickets/new",
            label: "Novo Ticket",
            icon: PlusCircle,
            exact: false,
            highlight: true
        },
        {
            href: "/portal/profile",
            label: "Meus Dados",
            icon: User,
            exact: true
        }
    ]

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const NavContent = () => (
        <>
            <div className="h-16 flex items-center px-6 border-b border-zinc-800 shrink-0">
                <span className="text-xl font-bold tracking-tight text-white">
                    GRAVTAH
                </span>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
                {navItems.map((item) => {
                    const isActive = item.exact
                        ? pathname === item.href
                        : pathname.startsWith(item.href)

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileMenuOpen(false)}
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

            <div className="p-4 border-t border-zinc-800 shrink-0">
                <button
                    onClick={handleSignOut}
                    className="flex w-full items-center gap-3 px-4 py-3 hover:text-white transition-colors"
                >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium text-sm uppercase tracking-wide">Sair</span>
                </button>
            </div>
        </>
    )

    return (
        <div className="flex min-h-screen bg-zinc-50">
            {/* MOBILE HEADER */}
            <header className="md:hidden fixed top-0 w-full h-16 bg-[#0C0C0C] z-50 flex items-center justify-between px-4 border-b border-zinc-800">
                <span className="text-lg font-bold tracking-tight text-white">GRAVTAH</span>
                <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800" onClick={() => setMobileMenuOpen(true)}>
                    <Menu className="w-6 h-6" />
                </Button>
            </header>

            {/* MOBILE SIDEBAR OVERLAY */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-[60] md:hidden">
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={() => setMobileMenuOpen(false)}
                    />

                    {/* Sidebar Drawer */}
                    <aside className="fixed inset-y-0 left-0 w-[80%] max-w-sm bg-[#0C0C0C] text-zinc-400 flex flex-col shadow-xl animate-in slide-in-from-left duration-200">
                        <div className="absolute top-4 right-4">
                            <Button variant="ghost" size="icon" className="text-white hover:bg-zinc-800" onClick={() => setMobileMenuOpen(false)}>
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                        <NavContent />
                    </aside>
                </div>
            )}

            {/* DESKTOP SIDEBAR */}
            <aside className="hidden md:flex w-64 bg-[#0C0C0C] text-zinc-400 flex-col fixed h-full inset-y-0 z-50">
                <NavContent />
            </aside>

            {/* MAIN CONTENT WRAPPER */}
            <div className="flex-1 flex flex-col h-full min-h-screen transition-all duration-200 md:ml-64 pt-16 md:pt-0">
                {/* Mobile padding top handled by wrapper pt-16 to account for fixed header */}
                {/* Desktop header if needed, otherwise removed to simplify */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-zinc-50">
                    <div className="max-w-5xl mx-auto h-full">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
