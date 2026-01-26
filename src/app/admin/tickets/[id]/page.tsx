import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TicketChat } from "@/components/ticket/ticket-chat"
import { TicketActions } from "@/components/ticket-actions"
import { FileText, ArrowLeft, Box, User, Calendar, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function AdminTicketPage(props: PageProps) {
    const { id } = await props.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Fetch Ticket
    const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*, profiles(*), ticket_attachments(*)")
        .eq("id", id)
        .single()

    if (error || !ticket) return notFound()

    // Fetch Messages
    const { data: messages } = await supabase
        .from("ticket_messages")
        .select("*, profiles(full_name, role)")
        .eq("ticket_id", id)
        .order("created_at", { ascending: true })

    const hasTraceabilityInfo = ticket.batch_number || ticket.manufacturing_date

    return (
        <div className="flex flex-col fixed inset-0 z-40 bg-white md:pl-64">
            {/* 1. HEADER (Sticky Top) */}
            <header className="h-16 border-b border-zinc-200 bg-white px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/admin/tickets" className="text-zinc-400 hover:text-black transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="h-6 w-px bg-zinc-200" />
                    <h1 className="font-black text-lg uppercase tracking-tight">
                        Ticket #{ticket.ticket_number}
                    </h1>
                    <Badge variant={ticket.status as any} className="uppercase text-[10px] tracking-wide">
                        {ticket.status.replace(/_/g, " ")}
                    </Badge>
                </div>

                <div className="flex items-center gap-6 text-xs font-medium text-zinc-500">
                    <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-zinc-400" />
                        <span className="uppercase">{ticket.profiles?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </header>

            {/* 2. CONTENT AREA (Flex Grow, Hidden Overflow) */}
            <div className="flex-1 flex overflow-hidden">

                {/* LEFT: CHAT (Flex Column) */}
                <main className="flex-1 flex flex-col min-w-0 bg-white relative border-r border-zinc-200">
                    <TicketChat
                        ticketId={ticket.id}
                        initialMessages={messages || []}
                        currentUserId={user.id}
                        currentUserRole="admin"
                    />
                </main>

                {/* RIGHT: CONTEXT SIDEBAR (Full Height Scroll) */}
                <aside className="w-[400px] bg-zinc-50 h-full overflow-y-auto p-6 space-y-8 hidden lg:block shrink-0">

                    {/* BLOCK 1: PRODUCT */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <Box className="w-3 h-3" /> Info Produto
                        </div>
                        <div>
                            <h2 className="font-bold text-lg leading-tight text-[#0C0C0C]">{ticket.product_name}</h2>
                            <ul className="text-sm text-zinc-500 mt-2 space-y-1">
                                <li className="flex justify-between">
                                    <span>Marca:</span> <span className="font-medium text-zinc-900">{ticket.brand}</span>
                                </li>
                                <li className="flex justify-between">
                                    <span>Modelo:</span> <span className="font-medium text-zinc-900">{ticket.model}</span>
                                </li>
                                {ticket.sku && (
                                    <li className="flex justify-between">
                                        <span>SKU:</span> <span className="font-mono bg-zinc-200 px-1 rounded text-xs">{ticket.sku}</span>
                                    </li>
                                )}
                            </ul>
                        </div>

                        {hasTraceabilityInfo && (
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-amber-800 font-bold text-[10px] uppercase mb-2">
                                    <AlertTriangle className="w-3 h-3" /> Dados de Rastreio
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-amber-600 block uppercase">Lote</span>
                                        <span className="font-mono text-sm font-bold text-amber-950">{ticket.batch_number || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-amber-600 block uppercase">Fabricação</span>
                                        <span className="font-mono text-sm font-bold text-amber-950">{ticket.manufacturing_date || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-zinc-200 w-full" />

                    {/* BLOCK 2: ACTIONS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            Controles
                        </div>
                        <TicketActions
                            ticketId={ticket.id}
                            currentStatus={ticket.status}
                            currentSolution={ticket.solution}
                        />
                    </div>

                    <div className="h-px bg-zinc-200 w-full" />

                    {/* BLOCK 3: ATTACHMENTS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <FileText className="w-3 h-3" /> Arquivos ({ticket.ticket_attachments?.length || 0})
                        </div>

                        {ticket.ticket_attachments && ticket.ticket_attachments.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {ticket.ticket_attachments.map((file: any) => {
                                    const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/warranty-files/${file.file_url}`
                                    const isImage = file.file_type?.startsWith('image/')

                                    return (
                                        <a
                                            key={file.id}
                                            href={publicUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="block aspect-square rounded-md border border-zinc-200 overflow-hidden hover:border-zinc-900 transition-colors bg-white relative group"
                                        >
                                            {isImage ? (
                                                <img src={publicUrl} alt="File" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                                    <FileText className="w-6 h-6" />
                                                    <span className="text-[8px] uppercase font-bold mt-1 max-w-[90%] truncate">
                                                        {file.file_type?.split('/')[1] || 'FILE'}
                                                    </span>
                                                </div>
                                            )}
                                        </a>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-xs text-zinc-400 italic">Sem anexos.</p>
                        )}
                    </div>

                    <div className="h-px bg-zinc-200 w-full" />

                    {/* Description */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            Relato do Cliente
                        </div>
                        <p className="text-sm text-zinc-600 leading-relaxed whitespace-pre-wrap">
                            {ticket.issue_description}
                        </p>
                    </div>

                </aside>
            </div>
        </div>
    )
}
