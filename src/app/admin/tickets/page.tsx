import { createClient } from "@/lib/supabase/server"
import { ExportButton } from "@/components/admin/export-button"
import { TicketsDataTable } from "@/components/admin/tickets-data-table"
export default async function AdminTicketsPage() {
    const supabase = await createClient()

    // Fetch all active tickets (explicit IN excludes finalizado and abandonado without referencing enum values)
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
        .in("status", ["novo", "em_analise", "aguardando_resposta", "aguardando_envio", "aguardando_fabrica", "aguardando_importacao", "aprovado", "negado"])
        .order("updated_at", { ascending: false })

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
