"use client"

import { useState, useRef, useEffect } from "react"
import { sendMessage } from "@/app/actions/ticket-actions"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import { Send, LockKeyhole, Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

export interface Message {
    id: string
    content: string
    created_at: string
    sender_id: string
    is_internal?: boolean
    profiles?: {
        full_name: string
        role: string
    }
}

interface TicketChatProps {
    ticketId: string
    initialMessages: Message[]
    currentUserId: string
    currentUserRole?: string // Added to fix lint and potential usage
    isBlocked?: boolean
}

export function TicketChat({ ticketId, initialMessages: messages, currentUserRole, isBlocked = false }: TicketChatProps) {
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)
    const router = useRouter()
    const readOnly = isBlocked && currentUserRole !== "admin"

    // Scroll to bottom on load and update
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    }, [messages])

    const handleSend = async () => {
        if (loading || readOnly || !newMessage.trim()) return

        setLoading(true)
        try {
            await sendMessage(ticketId, newMessage)
            setNewMessage("")
        } catch {
            toast.error("Não foi possível enviar. Confira se o ticket está bloqueado e tente novamente.")
            router.refresh()
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header do Chat */}
            <div className="h-16 border-b border-zinc-200 flex items-center px-6 shrink-0 bg-white">
                <h3 className="font-bold uppercase text-sm tracking-wide text-zinc-500">
                    Histórico de Conversa
                </h3>
                <span className="ml-auto text-xs text-zinc-400 font-medium">
                    {messages.length} mensagens
                </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-zinc-50/30">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
                        <Send className="w-12 h-12 mb-3 stroke-1" />
                        <span className="text-sm font-medium">Inicie a conversa...</span>
                    </div>
                )}

                {messages.map((msg) => {
                    const isAdminSender = msg.profiles?.role === 'admin'
                    return (
                        <div key={msg.id} className={`flex w-full ${isAdminSender ? 'justify-end' : 'justify-start'}`}>

                            <div className={`flex flex-col max-w-[85%] md:max-w-[70%] ${isAdminSender ? 'items-end' : 'items-start'}`}>
                                <div className="flex items-center gap-2 mb-1 px-1">
                                    <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider">
                                        {isAdminSender ? "Sup. Gravtah" : msg.profiles?.full_name?.split(' ')[0]}
                                    </span>
                                    <span
                                        className="text-[10px] text-zinc-300"
                                        suppressHydrationWarning
                                    >
                                        {format(new Date(msg.created_at), 'dd/MM HH:mm', { locale: ptBR })}
                                    </span>
                                </div>

                                <div className={`px-5 py-3 text-sm rounded-2xl shadow-sm whitespace-pre-wrap leading-relaxed ${isAdminSender
                                    ? 'bg-[#0C0C0C] text-white rounded-tr-none'
                                    : 'bg-white border border-zinc-200 text-zinc-800 rounded-tl-none'
                                    }`}>
                                    {msg.content}
                                </div>
                            </div>
                        </div>
                    )
                })}
                <div ref={bottomRef} className="pb-2" />
            </div>

            {readOnly ? (
                <div role="status" className="flex items-start gap-3 border-t border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700 shrink-0">
                    <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                        <p className="font-bold text-zinc-900">Este ticket está bloqueado</p>
                        <p className="mt-1">O envio de mensagens e anexos foi desativado pela equipe. Você pode consultar o histórico deste atendimento.</p>
                    </div>
                </div>
            ) : (
            <div className="p-4 bg-zinc-50 border-t border-zinc-200 shrink-0">
                <div className="relative">
                    <Textarea
                        value={newMessage}
                        aria-label="Mensagem para o atendimento"
                        disabled={loading}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Digite sua resposta..."
                        className="pr-14 min-h-[50px] resize-none py-3 bg-white border-zinc-200 focus-visible:ring-zinc-900 focus-visible:ring-offset-0 shadow-sm"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSend()
                            }
                        }}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 bottom-2 h-[42px] w-[42px] rounded-none bg-[#0C0C0C] hover:bg-zinc-800 transition-colors shadow-sm"
                        onClick={handleSend}
                        aria-label="Enviar mensagem"
                        disabled={loading || !newMessage.trim()}
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    </Button>
                </div>
            </div>
            )}
        </div>
    )
}
