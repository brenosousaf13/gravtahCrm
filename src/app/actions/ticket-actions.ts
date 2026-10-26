"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export async function sendMessage(ticketId: string, message: string) {
    if (typeof message !== "string" || !message.trim()) {
        throw new Error("Digite uma mensagem antes de enviar.")
    }
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
        throw new Error("Unauthorized")
    }

    // Get User Role
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profileError || !["admin", "cliente"].includes(profile?.role)) {
        throw new Error("Não foi possível verificar sua permissão de acesso.")
    }

    const isAdmin = profile?.role === 'admin'

    const { data: currentTicket, error: ticketError } = await supabase
        .from("tickets")
        .select("user_id, status, is_blocked")
        .eq("id", ticketId)
        .single()

    if (ticketError || !currentTicket) throw new Error("Ticket não encontrado.")
    if (!isAdmin && currentTicket.user_id !== user.id) {
        throw new Error("Você não tem permissão para acessar este ticket.")
    }
    if (!isAdmin && currentTicket.is_blocked) {
        throw new Error("Este ticket está bloqueado para novas mensagens.")
    }

    // 1. Insert Message
    const { error } = await supabase
        .from("ticket_messages")
        .insert({
            ticket_id: ticketId,
            content: message.trim(),
            sender_id: user.id
        })

    if (error) {
        if (error.code === "42501") {
            throw new Error("Não foi possível enviar. O ticket pode ter sido bloqueado ou sua permissão alterada.")
        }
        throw new Error("Não foi possível enviar a mensagem. Tente novamente.")
    }

    let nextStatus = currentTicket?.status

    // Auto-status for Admins: If ticket is active and admin replies, set to waiting for reply.
    if (isAdmin) {
        if (["novo", "em_analise", "aguardando_envio", "aguardando_importacao"].includes(currentTicket?.status || "")) {
            nextStatus = "aguardando_resposta"
        }
    } else {
        // Optional: We can auto-set it back to em_analise if the customer replies?
        // But the customer strictly asked about "Aguardando Resposta" not showing, so let's just 
        // leave the current status and rely on `has_admin_unread` for the admin to see it.
    }

    // 3. Update Ticket Status & Unread Flag
    await supabase
        .from("tickets")
        .update({
            status: nextStatus,
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

export async function setTicketBlocked(ticketId: string, blocked: boolean) {
    if (typeof ticketId !== "string" || !ticketId || typeof blocked !== "boolean") {
        throw new Error("Dados de bloqueio inválidos.")
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Sua sessão expirou. Faça login novamente.")

    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()

    if (profileError || profile?.role !== "admin") {
        throw new Error("Somente administradores têm permissão para bloquear tickets.")
    }

    const { data: ticket, error } = await supabase
        .from("tickets")
        .update({ is_blocked: blocked, updated_at: new Date().toISOString() })
        .eq("id", ticketId)
        .select("id")
        .single()

    if (error || !ticket) throw new Error("Não foi possível alterar o bloqueio do ticket.")

    for (const path of [
        `/admin/tickets/${ticketId}`, `/portal/tickets/${ticketId}`,
        "/admin/tickets", "/admin/finished-tickets", "/admin/dashboard",
        "/portal/dashboard", "/portal/finished-tickets",
    ]) revalidatePath(path)

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
