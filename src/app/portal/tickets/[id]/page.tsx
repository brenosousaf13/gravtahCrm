import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { TicketChat } from "@/components/ticket/ticket-chat"
import { FileText, ArrowLeft, Box, Calendar, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ClientTicketPage(props: PageProps) {
    const { id } = await props.params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    // Fetch Ticket
    const { data: ticket, error } = await supabase
        .from("tickets")
        .select("*, ticket_attachments(*)")
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
                    <Link href="/portal/dashboard" className="text-zinc-400 hover:text-black transition-colors">
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

                <div className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <Calendar className="w-4 h-4 text-zinc-400" />
                    <span>{new Date(ticket.created_at).toLocaleDateString()}</span>
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
                        currentUserRole="cliente"
                    />
                </main>

                {/* RIGHT: CONTEXT SIDEBAR (Full Height Scroll) */}
                <aside className="hidden lg:block w-[400px] bg-zinc-50 h-full overflow-y-auto p-6 space-y-8 shrink-0">

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
                            </ul>
                        </div>

                        {/* Traceability Alert Box */}
                        {hasTraceabilityInfo && (
                            <div className="bg-zinc-100 border border-zinc-200 p-3 rounded-md">
                                <div className="flex items-center gap-2 text-zinc-600 font-bold text-[10px] uppercase mb-2">
                                    <AlertTriangle className="w-3 h-3" /> Dados de Rastreio
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-zinc-500 block uppercase">Lote</span>
                                        <span className="font-mono text-sm font-bold text-zinc-800">{ticket.batch_number || "N/A"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-zinc-500 block uppercase">Fabricação</span>
                                        <span className="font-mono text-sm font-bold text-zinc-800">{ticket.manufacturing_date || "N/A"}</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-zinc-200 w-full" />

                    {/* BLOCK 2: ISSUE DESCRIPTION */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            Descrição do Problema
                        </h3>
                        <div className="bg-white p-4 border border-zinc-200 rounded-sm text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed shadow-sm">
                            {ticket.issue_description || <span className="italic text-zinc-400">Sem descrição.</span>}
                        </div>
                    </div>

                    <div className="h-px bg-zinc-200 w-full" />

                    {/* Solution Highlight */}
                    {ticket.solution && (
                        <div className="mt-4 p-4 bg-green-50 rounded-md border border-green-200 shadow-sm">
                            <span className="text-xs text-green-700 font-bold uppercase block tracking-wider mb-1">Status da Solução</span>
                            <p className="font-bold text-lg capitalize text-green-900">{ticket.solution}</p>
                        </div>
                    )}

                    {/* BLOCK 3: ATTACHMENTS */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                            <FileText className="w-3 h-3" /> Seus Anexos ({ticket.ticket_attachments?.length || 0})
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
                </aside>
            </div>
        </div>
    )
}
