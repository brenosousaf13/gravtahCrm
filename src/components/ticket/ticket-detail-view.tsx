"use client"

import { useState } from "react"
import { Badge, type BadgeProps } from "@/components/ui/badge"
import { TicketChat, type Message } from "@/components/ticket/ticket-chat"
import { TicketAttachments, type TicketAttachment } from "@/components/ticket/ticket-attachments"
import { TicketBlockedBadge } from "@/components/ticket/ticket-blocked-badge"
import { TicketRealtime } from "@/components/ticket/ticket-realtime"
import { Box, Calendar, AlertTriangle, Info, X } from "lucide-react"
import { BackButton } from "@/components/ui/back-button"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TicketDetailViewProps {
    ticket: {
        id: string
        ticket_number: number
        status: string
        is_blocked: boolean
        created_at: string
        product_name: string
        brand: string
        model: string
        batch_number: string | null
        manufacturing_date: string | null
        issue_description: string | null
        solution: string | null
        ticket_attachments: TicketAttachment[]
    }
    messages: Message[]
    currentUserId: string
}

export function TicketDetailView({ ticket, messages, currentUserId }: TicketDetailViewProps) {
    const [showMobileInfo, setShowMobileInfo] = useState(false)
    const hasTraceabilityInfo = ticket.batch_number || ticket.manufacturing_date

    return (
        <div className="flex flex-col fixed inset-0 z-40 bg-white md:pl-64 pt-16 md:pt-0">
            <TicketRealtime ticketId={ticket.id} />
            <header className="min-h-16 border-b border-zinc-200 bg-white px-4 md:px-6 py-2 flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <BackButton />
                    <div className="h-6 w-px bg-zinc-200 shrink-0" />
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 min-w-0">
                        <h1 className="font-black text-sm md:text-lg uppercase tracking-tight truncate">Ticket #{ticket.ticket_number}</h1>
                        <div className="flex flex-wrap items-center gap-1">
                            <Badge variant={ticket.status as BadgeProps["variant"]} className="uppercase text-[10px] tracking-wide w-fit">
                                {ticket.status.replace(/_/g, " ")}
                            </Badge>
                            {ticket.is_blocked && <TicketBlockedBadge />}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Button variant="ghost" size="icon" className="lg:hidden text-zinc-500" aria-label="Ver informações do ticket" onClick={() => setShowMobileInfo(true)}>
                        <Info aria-hidden="true" className="w-5 h-5" />
                    </Button>
                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <Calendar aria-hidden="true" className="w-4 h-4 text-zinc-400" />
                        <span suppressHydrationWarning>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </header>

            <div className="flex-1 flex overflow-hidden relative">
                <main className="flex-1 flex flex-col min-w-0 bg-white relative border-r border-zinc-200">
                    <TicketChat ticketId={ticket.id} initialMessages={messages || []} currentUserId={currentUserId} currentUserRole="cliente" isBlocked={ticket.is_blocked} />
                </main>
                <aside className={cn(
                    "fixed inset-0 z-50 bg-white transform transition-transform duration-300 lg:relative lg:transform-none lg:w-[400px] lg:bg-zinc-50 lg:block lg:inset-auto overflow-y-auto p-6 space-y-8 shrink-0",
                    showMobileInfo ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    <div className="lg:hidden flex justify-end mb-4">
                        <Button variant="ghost" size="icon" aria-label="Fechar informações do ticket" onClick={() => setShowMobileInfo(false)}><X aria-hidden="true" className="w-6 h-6" /></Button>
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider"><Box className="w-3 h-3" /> Info Produto</div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight text-[#0C0C0C]">{ticket.product_name}</h2>
                            <ul className="text-sm text-zinc-500 mt-2 space-y-1">
                                <li className="flex justify-between"><span>Marca:</span><span className="font-medium text-zinc-900">{ticket.brand}</span></li>
                                <li className="flex justify-between"><span>Modelo:</span><span className="font-medium text-zinc-900">{ticket.model}</span></li>
                            </ul>
                        </div>
                        {hasTraceabilityInfo && (
                            <div className="bg-zinc-100 border border-zinc-200 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-zinc-600 font-bold text-[10px] uppercase mb-2"><AlertTriangle className="w-3 h-3" /> Dados de Rastreio</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><span className="text-[10px] text-zinc-500 block uppercase">Lote</span><span className="font-mono text-sm font-bold text-zinc-800">{ticket.batch_number || "N/A"}</span></div>
                                    <div><span className="text-[10px] text-zinc-500 block uppercase">Fabricação</span><span className="font-mono text-sm font-bold text-zinc-800">{ticket.manufacturing_date || "N/A"}</span></div>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="h-px bg-zinc-200 w-full" />
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Descrição do Problema</h3>
                        <div className="bg-white p-4 border border-zinc-200 rounded-sm text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {ticket.issue_description || <span className="italic text-zinc-400">Sem descrição.</span>}
                        </div>
                    </div>
                    <div className="h-px bg-zinc-200 w-full" />
                    {ticket.solution && (
                        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200 shadow-sm">
                            <span className="text-xs text-green-700 font-bold uppercase block tracking-wider mb-1">Status da Solução</span>
                            <p className="font-bold text-lg capitalize text-green-900">{ticket.solution}</p>
                        </div>
                    )}
                    <TicketAttachments ticketId={ticket.id} attachments={ticket.ticket_attachments || []} userId={currentUserId} readOnly={ticket.is_blocked} />
                </aside>
            </div>
        </div>
    )
}
