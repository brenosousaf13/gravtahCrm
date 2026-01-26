"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Eye, Search, ChevronLeft, ChevronRight } from "lucide-react"

interface Ticket {
    id: string
    ticket_number: number
    created_at: string
    status: string
    product_name: string
    brand: string
    profiles: {
        full_name: string | null
        email: string | null
    } | null
}

interface TicketsDataTableProps {
    tickets: Ticket[]
}

export function TicketsDataTable({ tickets }: TicketsDataTableProps) {
    const router = useRouter()
    const [search, setSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState("all")
    const [brandFilter, setBrandFilter] = useState("all")
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    // Filter Logic
    const filteredTickets = tickets.filter((ticket) => {
        const matchesSearch =
            search === "" ||
            ticket.ticket_number.toString().includes(search) ||
            (ticket.product_name && ticket.product_name.toLowerCase().includes(search.toLowerCase())) ||
            (ticket.brand && ticket.brand.toLowerCase().includes(search.toLowerCase())) ||
            (ticket.profiles?.full_name && ticket.profiles.full_name.toLowerCase().includes(search.toLowerCase())) ||
            (ticket.profiles?.email && ticket.profiles.email.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter
        const matchesBrand = brandFilter === "all" || (ticket.brand && ticket.brand === brandFilter)

        return matchesSearch && matchesStatus && matchesBrand
    })

    // Pagination Logic
    const totalPages = Math.ceil(filteredTickets.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedTickets = filteredTickets.slice(startIndex, startIndex + itemsPerPage)

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value)
        setCurrentPage(1) // Reset to first page
    }

    const handleStatusChange = (value: string) => {
        setStatusFilter(value)
        setCurrentPage(1) // Reset to first page
    }

    const handleBrandChange = (value: string) => {
        setBrandFilter(value)
        setCurrentPage(1) // Reset to first page
    }

    // Unique Brands for Filter
    const brands = Array.from(new Set(tickets.map(t => t.brand).filter(Boolean))).sort()

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Buscar por ID, cliente, produto..."
                        value={search}
                        onChange={handleSearchChange}
                        className="pl-8"
                    />
                </div>

                <div className="flex gap-2 flex-col md:flex-row">
                    <Select value={brandFilter} onValueChange={handleBrandChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar Marca" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Marcas</SelectItem>
                            {brands.map(brand => (
                                <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={handleStatusChange}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os Status</SelectItem>
                            <SelectItem value="novo">Novos</SelectItem>
                            <SelectItem value="em_analise">Em Análise</SelectItem>
                            <SelectItem value="aguardando_resposta">Aguardando Resp.</SelectItem>
                            <SelectItem value="aguardando_fabrica">Aguardando Fábrica</SelectItem>
                            <SelectItem value="aprovado">Aprovados</SelectItem>
                            <SelectItem value="negado">Negados</SelectItem>
                            <SelectItem value="finalizado">Finalizados</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="rounded-md border border-zinc-200">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                            <TableHead className="w-[100px]">ID</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Cliente</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {paginatedTickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center text-zinc-500">
                                    Nenhum ticket encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            paginatedTickets.map((ticket) => (
                                <TableRow
                                    key={ticket.id}
                                    className="hover:bg-zinc-100 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                                >
                                    <TableCell className="font-bold text-[#0C0C0C]">
                                        #{ticket.ticket_number}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-medium text-[#0C0C0C]">{ticket.product_name}</span>
                                            <span className="text-xs text-zinc-500 uppercase font-bold">{ticket.brand}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">{ticket.profiles?.full_name || "N/A"}</span>
                                            <span className="text-xs text-zinc-500">{ticket.profiles?.email}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-zinc-600 text-sm">
                                        {new Date(ticket.created_at).toLocaleDateString('pt-BR')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status as any} className="uppercase text-[10px]">
                                            {ticket.status.replace(/_/g, " ")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            <Eye className="h-4 w-4 text-zinc-500" />
                                            <span className="sr-only">Ver detalhes</span>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-zinc-500">
                        Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredTickets.length)} de {filteredTickets.length} resultados
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Anterior
                        </Button>
                        <div className="text-sm font-medium">
                            Página {currentPage} de {totalPages}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                        >
                            Próximo
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
