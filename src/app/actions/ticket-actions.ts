"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendMessage(ticketId: string, message: string) {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Get User Role
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    console.log('[sendMessage] User:', user.email, 'Role:', profile?.role)

    const isAdmin = profile?.role === 'admin'

    // 1. Insert Message
    const { error } = await supabase
        .from("ticket_messages")
        .insert({
            ticket_id: ticketId,
            content: message,
            sender_id: user.id
        })

    if (error) {
        console.error("Error sending message:", error)
        throw new Error("Failed to send message")
    }

    // 2. Update Ticket Status (Unread Flag)
    await supabase
        .from("tickets")
        .update({
            has_admin_unread: !isAdmin,
            updated_at: new Date().toISOString()
        })
        .eq("id", ticketId)

    // Revalidate Paths
    revalidatePath(`/portal/tickets/${ticketId}`)
    revalidatePath(`/admin/tickets/${ticketId}`)
    revalidatePath("/admin/tickets") // Update list view

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
