import { createClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { TicketDetailView } from "@/components/ticket/ticket-detail-view"

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

    return <TicketDetailView ticket={ticket} messages={messages || []} currentUserId={user.id} />
}
