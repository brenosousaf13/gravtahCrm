import { createClient } from "@/lib/supabase/server"
import { ExportButton } from "@/components/admin/export-button"
import { TicketsDataTable } from "@/components/admin/tickets-data-table"

export default async function AdminTicketsPage() {
    const supabase = await createClient()

    // Fetch all tickets for client-side filtering (MVP)
    // Ordered by newest first
    const { data: tickets, error } = await supabase
        .from("tickets")
        .select(`
            *,
            ticket_attachments(*),
            profiles (
                full_name,
                email,
                document
            )
        `)
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching tickets:", error)
        return <div className="p-8 text-red-500">Erro ao carregar tickets.</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-[#0C0C0C]">
                        Gerenciar Tickets
                    </h1>
                    <p className="text-zinc-500">
                        Visualize e gerencie todas as solicitações de garantia.
                    </p>
                </div>
                <ExportButton tickets={tickets || []} />
            </div>

            <TicketsDataTable tickets={tickets || []} />
        </div>
    )
}
