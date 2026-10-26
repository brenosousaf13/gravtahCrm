import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import NewTicketForm from "@/components/ticket/new-ticket-form"
import { CustomerCreationBlockedNotice } from "@/components/ticket/customer-creation-blocked-notice"

export default async function NewTicketPage() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) redirect("/login")

    const { data: profile, error } = await supabase
        .from("profiles").select("role, is_ticket_creation_blocked").eq("id", user.id).single()

    if (error || !profile || !["admin", "cliente"].includes(profile.role)) {
        return (
            <div role="alert" className="space-y-3 text-sm text-zinc-700">
                <p>Não foi possível verificar a permissão para abrir tickets. Atualize a página e tente novamente.</p>
                <Link href="/portal/dashboard" className="underline underline-offset-4">Voltar aos meus tickets</Link>
            </div>
        )
    }
    if (profile.role !== "admin" && profile.is_ticket_creation_blocked) {
        return (
            <div className="space-y-4">
                <CustomerCreationBlockedNotice />
                <Link href="/portal/dashboard" className="text-sm underline underline-offset-4">Voltar aos meus tickets</Link>
            </div>
        )
    }
    return <NewTicketForm />
}
