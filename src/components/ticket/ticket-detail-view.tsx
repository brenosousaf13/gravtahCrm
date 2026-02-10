
"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { TicketChat } from "@/components/ticket/ticket-chat"
import { FileText, ArrowLeft, Box, Calendar, AlertTriangle, Info, X, Loader2, Upload } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TicketDetailViewProps {
    ticket: any
    messages: any[]
    currentUserId: string
}

export function TicketDetailView({ ticket, messages, currentUserId }: TicketDetailViewProps) {
    const [showMobileInfo, setShowMobileInfo] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const router = useRouter()

    const hasTraceabilityInfo = ticket.batch_number || ticket.manufacturing_date

    // Helper for public URLs (same as before)
    const getPublicUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/warranty-files/${path}`

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        setIsUploading(true)
        const supabase = createClient()
        const files = Array.from(e.target.files)
        let successCount = 0

        try {
            const uploadPromises = files.map(async (file, index) => {
                const fileExt = file.name.split('.').pop()
                const uniqueId = Math.random().toString(36).substring(7)
                // Usando currentUserId para manter consistência da pasta, se possível. 
                // Se o usuário atual for admin vendo a view (não deveria acontecer nessa view específica que é para clientes), ok.
                const fileName = `${currentUserId}/${ticket.id}/${Date.now()}_${index}_${uniqueId}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from("warranty-files")
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { error: attachError } = await supabase.from("ticket_attachments").insert({
                    ticket_id: ticket.id,
                    file_url: fileName,
                    file_type: file.type
                })

                if (attachError) throw attachError

                successCount++
            })

            await Promise.all(uploadPromises)

            toast.success(`${successCount} arquivos enviados com sucesso!`)
            router.refresh()

        } catch (error) {
            console.error("Erro ao enviar arquivos:", error)
            toast.error("Alguns arquivos não puderam ser enviados.")
        } finally {
            setIsUploading(false)
            // Reset input
            e.target.value = ""
        }
    }

    return (
        <div className="flex flex-col fixed inset-0 z-40 bg-white md:pl-64 pt-16 md:pt-0">
            {/* 1. HEADER (Sticky Top) - Adjusted for Mobile */}
            <header className="h-16 border-b border-zinc-200 bg-white px-4 md:px-6 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
                    <Link href="/portal/dashboard" className="text-zinc-400 hover:text-black transition-colors shrink-0">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div className="h-6 w-px bg-zinc-200 shrink-0" />
                    <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 min-w-0">
                        <h1 className="font-black text-sm md:text-lg uppercase tracking-tight truncate">
                            Ticket #{ticket.ticket_number}
                        </h1>
                        <Badge variant={ticket.status as any} className="uppercase text-[10px] tracking-wide w-fit">
                            {ticket.status.replace(/_/g, " ")}
                        </Badge>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile Info Toggle */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="lg:hidden text-zinc-500"
                        onClick={() => setShowMobileInfo(true)}
                    >
                        <Info className="w-5 h-5" />
                    </Button>

                    <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-500">
                        <Calendar className="w-4 h-4 text-zinc-400" />
                        <span suppressHydrationWarning>{new Date(ticket.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                </div>
            </header>

            {/* 2. CONTENT AREA */}
            <div className="flex-1 flex overflow-hidden relative">

                {/* LEFT: CHAT */}
                <main className="flex-1 flex flex-col min-w-0 bg-white relative border-r border-zinc-200">
                    <TicketChat
                        ticketId={ticket.id}
                        initialMessages={messages || []}
                        currentUserId={currentUserId}
                        currentUserRole="cliente"
                    />
                </main>

                {/* RIGHT: CONTEXT SIDEBAR (Responsive Overlay on Mobile, Sidebar on Desktop) */}
                <aside className={cn(
                    "fixed inset-0 z-50 bg-white transform transition-transform duration-300 lg:relative lg:transform-none lg:w-[400px] lg:bg-zinc-50 lg:block lg:inset-auto overflow-y-auto p-6 space-y-8 shrink-0",
                    showMobileInfo ? "translate-x-0" : "translate-x-full lg:translate-x-0"
                )}>
                    {/* Mobile Close Button */}
                    <div className="lg:hidden flex justify-end mb-4">
                        <Button variant="ghost" size="icon" onClick={() => setShowMobileInfo(false)}>
                            <X className="w-6 h-6" />
                        </Button>
                    </div>

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
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                                <FileText className="w-3 h-3" /> Seus Anexos ({ticket.ticket_attachments?.length || 0})
                            </div>

                            <div className="relative">
                                <input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="client-upload"
                                    onChange={handleUpload}
                                    disabled={isUploading}
                                />
                                <label
                                    htmlFor="client-upload"
                                    className={`
                                        cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider 
                                        px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors
                                        ${isUploading ? "opacity-50 pointer-events-none" : ""}
                                    `}
                                >
                                    {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                                    {isUploading ? "Enviando..." : "Adicionar"}
                                </label>
                            </div>
                        </div>

                        {ticket.ticket_attachments && ticket.ticket_attachments.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {ticket.ticket_attachments.map((file: any) => {
                                    const publicUrl = getPublicUrl(file.file_url)
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
