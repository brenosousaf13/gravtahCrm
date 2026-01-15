"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendMessage(ticketId: string, message: string) {
    const supabase = await createClient()

    // 1. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // 2. Get User Role to determine status update
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (!profile) throw new Error("Profile not found")

    // 3. Insert Message
    const { error: msgError } = await supabase.from("ticket_messages").insert({
        ticket_id: ticketId,
        sender_id: user.id,
        content: message,
    })

    if (msgError) throw new Error("Failed to send message")

    // 4. Update Ticket Status based on sender
    const newStatus = profile.role === "admin" ? "aguardando_resposta" : "em_analise"

    const { error: statusError } = await supabase
        .from("tickets")
        .update({
            status: newStatus,
            updated_at: new Date().toISOString()
        })
        .eq("id", ticketId)

    if (statusError) throw new Error("Failed to update status")

    // 5. Revalidate Paths
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
