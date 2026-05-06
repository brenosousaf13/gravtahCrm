import { createClient } from "@/lib/supabase/server"
import { ExportButton } from "@/components/admin/export-button"
import { TicketsDataTable } from "@/components/admin/tickets-data-table"

export default async function AdminFinishedTicketsPage() {
    const supabase = await createClient()

    // Fetch archived tickets: everything that is NOT an active status
    // Using NOT IN avoids referencing "abandonado" directly (enum safety)
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
        .not("status", "in", "(novo,em_analise,aguardando_resposta,aguardando_envio,aguardando_fabrica,aguardando_importacao,aprovado,negado)")
        .order("updated_at", { ascending: false })

    if (error) {
        console.error("Error fetching finished tickets:", error)
        return <div className="p-8 text-red-500">Erro ao carregar tickets finalizados.</div>
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight text-[#0C0C0C]">
                        Tickets Arquivados
                    </h1>
                    <p className="text-zinc-500">
                        Histórico de solicitações finalizadas ou abandonadas.
                    </p>
                </div>
                <ExportButton tickets={tickets || []} />
            </div>

            <TicketsDataTable tickets={tickets || []} />
        </div>
    )
}
