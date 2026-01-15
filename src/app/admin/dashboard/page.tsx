import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Eye, TrendingUp, Clock, AlertCircle } from "lucide-react"
import { AnalyticsCharts } from "@/components/admin/analytics-charts"
import { ExportButton } from "@/components/admin/export-button"

export default async function AdminDashboard() {
    const supabase = await createClient()

    // FETCH ALL DATA (Optimize later if needed, good for MVP < 1000 records)
    const { data: allTickets, error } = await supabase
        .from("tickets")
        .select("*, profiles(full_name, email, document)")
        .order("created_at", { ascending: false })

    if (error) {
        console.error("Error fetching tickets:", error)
        return <div>Erro ao carregar dados.</div>
    }

    const tickets = allTickets || []

    // --- KPI CALCULATIONS ---

    // 1. Counts
    const totalTickets = tickets.length
    const newTickets = tickets.filter(t => t.status === "novo").length
    const processingTickets = tickets.filter(t => t.status === "em_analise").length
    const openTickets = tickets.filter(t => !["finalizado", "negado", "aprovado"].includes(t.status)).length // Concept of "Open" workflow

    // 2. Avg Resolution Time (for 'finalizado'/'aprovado'/'negado' tickets that have closed_at)
    // Assuming we will have a 'closed_at' field or we calculate based on status change logs.
    // For now, let's use the 'closed_at' field if it exists, or just verify status.
    // If 'closed_at' is null, we can't calc.
    const resolvedTickets = tickets.filter(t => t.closed_at)
    let avgResolutionDays = 0

    if (resolvedTickets.length > 0) {
        const totalDurationMs = resolvedTickets.reduce((acc, t) => {
            const start = new Date(t.created_at).getTime()
            const end = new Date(t.closed_at).getTime()
            return acc + (end - start)
        }, 0)
        avgResolutionDays = Math.round(totalDurationMs / (1000 * 60 * 60 * 24) / resolvedTickets.length)
    }

    // 3. Top Defective Products (Group by Product Name or Model)
    // Let's use Model for precision
    const productCount: Record<string, number> = {}
    tickets.forEach(t => {
        const key = t.model || t.product_name || "Desconhecido"
        productCount[key] = (productCount[key] || 0) + 1
    })

    const topProducts = Object.entries(productCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5)

    // 4. Status Distribution
    const statusCount: Record<string, number> = {}
    tickets.forEach(t => {
        statusCount[t.status] = (statusCount[t.status] || 0) + 1
    })
    const statusDistribution = Object.entries(statusCount).map(([name, value]) => ({ name, value }))


    // Recent for Table
    const recentTickets = tickets.slice(0, 8)

    return (
        <div className="flex-1 space-y-4 p-6 w-full">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black uppercase tracking-tight text-[#0C0C0C]">
                        Painel de Controle
                    </h1>
                </div>
                <ExportButton tickets={tickets} />
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 w-full">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-sm font-medium">Novos Tickets</CardTitle>
                        <AlertCircle className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-[#0C0C0C]">{newTickets}</div>
                        <p className="text-xs text-muted-foreground mt-1">Aguardando triagem</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-sm font-medium">Em Processo</CardTitle>
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-blue-600">{openTickets}</div>
                        <p className="text-xs text-muted-foreground mt-1">Total em andamento</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-sm font-medium">Tempo Médio</CardTitle>
                        <Clock className="h-4 w-4 text-zinc-500" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-zinc-700">{avgResolutionDays} <span className="text-xs font-normal text-zinc-400">dias</span></div>
                        <p className="text-xs text-muted-foreground mt-1">Para resolução final</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 pb-2">
                        <CardTitle className="text-sm font-medium">Total Acumulado</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-zinc-400">
                            {totalTickets}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Histórico completo</p>
                    </CardContent>
                </Card>
            </div>

            {/* CHARTS SECTION */}
            <AnalyticsCharts topProducts={topProducts} statusDistribution={statusDistribution} />

            {/* Recent Tickets Table */}
            <Card>
                <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-sm font-medium">Últimas Solicitações</CardTitle>
                        <Link href="/admin/tickets">
                            <Button variant="ghost" size="sm" className="h-8 text-xs">Ver Todos</Button>
                        </Link>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="pl-4">ID</TableHead>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Produto/Marca</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead className="text-right pr-4">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentTickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-zinc-500">
                                        Nenhum registro encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentTickets.map((ticket: any) => (
                                    <TableRow key={ticket.id}>
                                        <TableCell className="font-bold pl-4">#{ticket.ticket_number}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-[#0C0C0C] text-xs">{ticket.profiles?.full_name || 'N/A'}</span>
                                                <span className="text-[10px] text-zinc-500">{ticket.profiles?.email}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-xs">{ticket.product_name}</span>
                                                <span className="text-[10px] text-zinc-500">{ticket.brand}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {/* Using replace to format status nicely */}
                                            <Badge variant={ticket.status as any} className="text-[10px] px-1 py-0">{ticket.status.replace(/_/g, " ")}</Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-xs">
                                            {new Date(ticket.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right pr-4">
                                            <Link href={`/admin/tickets/${ticket.id}`}>
                                                <Button size="icon" variant="ghost" className="h-8 w-8">
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
