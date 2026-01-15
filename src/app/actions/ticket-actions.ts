"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendMessage(ticketId: string, message: string) {
    const supabase = await createClient()

    const { error } = await supabase.rpc('send_ticket_message', {
        p_ticket_id: ticketId,
        p_content: message,
    })

    if (error) {
        console.error("Error sending message:", error)
        throw new Error("Failed to send message")
    }

    // Revalidate Paths
    revalidatePath(`/portal/tickets/${ticketId}`)
    revalidatePath(`/admin/tickets/${ticketId}`)

    return { success: true }
}

export async function updateTicketStatus(ticketId: string, status: string, solution?: string | null) {
    const supabase = await createClient()

    // Verify Admin
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profile?.role !== "admin") throw new Error("Forbidden")

    const { error } = await supabase
        .from("tickets")
        .update({
            status,
            solution: solution || null,
            updated_at: new Date().toISOString()
        })
        .eq("id", ticketId)

    if (error) throw new Error("Failed to update status")

    revalidatePath(`/admin/tickets/${ticketId}`)
    revalidatePath(`/portal/tickets/${ticketId}`)

    return { success: true }
}
