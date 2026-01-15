import { createClient } from "@/lib/supabase/server"
import { TicketCard } from "@/components/ticket-card"
import { PackageOpen, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default async function PortalDashboard() {
    const supabase = await createClient()

    // 1. Get User
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return <div>Non-authenticated</div>
    }

    // 2. Fetch Tickets
    const { data: tickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })

    return (
        <div className="flex-1 space-y-4 w-full p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-2xl font-black uppercase tracking-tight text-[#0C0C0C]">
                        Meus Chamados
                    </h1>
                </div>
                <Link href="/portal/tickets/new">
                    <Button className="bg-[#0C0C0C] hover:bg-zinc-800 text-white gap-2 uppercase font-bold tracking-wide">
                        <Plus className="w-4 h-4" /> Novo Ticket
                    </Button>
                </Link>
            </div>

            {!tickets || tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-zinc-200 rounded-lg bg-zinc-50/50 min-h-[400px]">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                        <PackageOpen className="w-8 h-8 text-zinc-400" />
                    </div>
                    <h3 className="text-lg font-bold text-zinc-900 mb-1">
                        Nenhum ticket encontrado
                    </h3>
                    <p className="text-zinc-500 text-sm max-w-sm text-center mb-6">
                        Você ainda não abriu nenhuma solicitação de garantia.
                    </p>
                    <Link href="/portal/tickets/new">
                        <Button className="bg-[#0C0C0C] hover:bg-zinc-800 text-white">
                            Abrir meu primeiro ticket
                        </Button>
                    </Link>
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
