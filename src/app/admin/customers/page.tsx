import { createClient } from "@/lib/supabase/server"
import { CustomersDataTable } from "@/components/admin/customers-data-table"

export default async function AdminCustomersPage() {
    const supabase = await createClient()

    // 1. Fetch Profiles (Clients)
    const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "cliente")
        .order("created_at", { ascending: false })

    if (profilesError) {
        console.error("Error fetching profiles:", profilesError)
        return <div className="p-8 text-red-500">Erro ao carregar clientes.</div>
    }

    // 2. Fetch All Tickets to Aggregate Counts
    const { data: tickets } = await supabase
        .from("tickets")
        .select("user_id")

    const ticketCounts: Record<string, number> = {}
    if (tickets) {
        tickets.forEach(ticket => {
            if (ticket.user_id) {
                ticketCounts[ticket.user_id] = (ticketCounts[ticket.user_id] || 0) + 1
            }
        })
    }

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-[#0C0C0C]">
                    Base de Clientes
                </h1>
                <p className="text-zinc-500">
                    Gerencie os usuários cadastrados no portal.
                </p>
            </div>

            <CustomersDataTable
                profiles={profiles || []}
                ticketCounts={ticketCounts}
            />
        </div>
    )
}
