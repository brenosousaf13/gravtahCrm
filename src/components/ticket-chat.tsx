"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, ShieldAlert } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Message {
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
    currentUserRole: "admin" | "cliente"
    currentUserId: string
}

export function TicketChat({ ticketId, currentUserRole, currentUserId }: TicketChatProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [newMessage, setNewMessage] = useState("")
    const [loading, setLoading] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchMessages()

        // Realtime subscription
        const channel = supabase
            .channel("ticket_messages")
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "ticket_messages",
                    filter: `ticket_id=eq.${ticketId}`,
                },
                (payload) => {
                    fetchMessages() // Refresh to get profile data join
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [ticketId])

    const fetchMessages = async () => {
        const { data, error } = await supabase
            .from("ticket_messages")
            .select("*, profiles(full_name, role)")
            .eq("ticket_id", ticketId)
            .order("created_at", { ascending: true })

        if (error) {
            console.error("Error fetching messages:", error)
        } else {
            setMessages(data || [])
        }
    }

    const handleSendMessage = async () => {
        if (!newMessage.trim()) return

        setLoading(true)
        try {
            // 1. Insert Message
            const { error } = await supabase.from("ticket_messages").insert({
                ticket_id: ticketId,
                sender_id: currentUserId,
                content: newMessage,
            })

            if (error) throw error

            setNewMessage("")

            // 2. Update Ticket Status (Auto-Trigger)
            // If Client sends -> em_analise (Reopened for review)
            // If Admin sends -> aguardando_resposta (Waiting for customer)
            // Only update if not already in that state to avoid noise, ideally handled by backend triggers but good for UI responsiveness
            const targetStatus = currentUserRole === 'admin' ? 'aguardando_resposta' : 'em_analise'

            await supabase
                .from("tickets")
                .update({ status: targetStatus, updated_at: new Date().toISOString() })
                .eq("id", ticketId)

            router.refresh() // Refresh server components to show new status badge in parent

        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao enviar mensagem.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-zinc-50/30">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-400 opacity-50">
                        <ShieldAlert className="w-12 h-12 mb-2 stroke-1" />
                        <span className="text-sm font-medium">Nenhuma mensagem ainda</span>
                    </div>
                )}

                {messages.map((msg) => {
                    const isMe = msg.sender_id === currentUserId
                    const isAdmin = msg.profiles?.role === 'admin'

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`flex gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                {/* Avatar */}
                                <Avatar className="w-8 h-8 mt-1 border border-zinc-100 shadow-sm">
                                    <AvatarFallback className={isAdmin ? 'bg-[#0C0C0C] text-white' : 'bg-white text-zinc-600'}>
                                        {isAdmin ? <ShieldAlert className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                    </AvatarFallback>
                                </Avatar>

                                {/* Bubble */}
                                <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1 px-1">
                                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                                            {isAdmin ? 'Suporte' : msg.profiles?.full_name?.split(' ')[0]}
                                        </span>
                                        <span className="text-[10px] text-zinc-400">
                                            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div className={`p-3 text-sm leading-relaxed shadow-sm ${isMe
                                        ? 'bg-zinc-800 text-white rounded-2xl rounded-tr-none'
                                        : 'bg-white text-zinc-800 rounded-2xl rounded-tl-none border border-zinc-100'
                                        }`}>
                                        {msg.content}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Input Area - Fixed at Bottom */}
            <div className="p-4 border-t border-zinc-200 bg-white">
                <div className="flex gap-3 items-end">
                    <Textarea
                        placeholder="Digite sua resposta..."
                        className="resize-none focus-visible:ring-zinc-900 border-zinc-200 bg-zinc-50 min-h-[60px] max-h-[120px]"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                handleSendMessage()
                            }
                        }}
                    />
                    <Button
                        onClick={handleSendMessage}
                        disabled={loading || !newMessage.trim()}
                        className="h-[60px] px-6 bg-[#0C0C0C] hover:bg-zinc-800"
                    >
                        {loading ? "..." : "Enviar"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
