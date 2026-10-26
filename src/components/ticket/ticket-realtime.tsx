"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function TicketRealtime({ ticketId }: { ticketId: string }) {
    const router = useRouter()

    useEffect(() => {
        const supabase = createClient()
        const refresh = () => router.refresh()
        const channel = supabase
            .channel(`ticket-detail-${ticketId}`)
            .on("postgres_changes", { event: "UPDATE", schema: "public", table: "tickets", filter: `id=eq.${ticketId}` }, refresh)
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "ticket_messages", filter: `ticket_id=eq.${ticketId}` }, refresh)
            .subscribe((status) => { if (status === "SUBSCRIBED") refresh() })

        window.addEventListener("focus", refresh)
        return () => {
            window.removeEventListener("focus", refresh)
            void supabase.removeChannel(channel)
        }
    }, [ticketId, router])

    return null
}
