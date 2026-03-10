import { createClient } from "@/lib/supabase/server"
import { TicketCard } from "@/components/ticket-card"
import { Archive } from "lucide-react"
import Link from "next/link"

export default async function PortalFinishedTicketsPage() {
    const supabase = await createClient()

    // 1. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return <div>Non-authenticated</div>
    }

    // 2. Fetch Finished Tickets only
    const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "finalizado")
        .order("updated_at", { ascending: false })

    return (
        <div className="flex-1 space-y-4 w-full p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-[#0C0C0C]">
                        Tickets Finalizados
                    </h1>
                </div>
            </div>

            {!tickets || tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 min-h-[400px]">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <Archive className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">
                        Nenhum ticket finalizado
                    </h3>
                    <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                        Você não possui nenhuma solicitação de garantia concluída no momento.
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-3 auto-rows-fr">
                    {tickets.map((ticket) => (
                        <div key={ticket.id} className="h-full">
                            <TicketCard
                                id={ticket.id}
                                ticketNumber={ticket.ticket_number}
                                productName={ticket.product_name}
                                brand={ticket.brand}
                                status={ticket.status}
                                createdAt={ticket.created_at}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
