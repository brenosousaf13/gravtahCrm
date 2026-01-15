"use client"

import { useState } from "react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Search } from "lucide-react"

interface Profile {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    document: string | null
    avatar_url: string | null
    created_at: string
}

interface CustomersDataTableProps {
    profiles: Profile[]
    ticketCounts: Record<string, number>
}

export function CustomersDataTable({ profiles, ticketCounts }: CustomersDataTableProps) {
    const [search, setSearch] = useState("")

    const filteredProfiles = profiles.filter((profile) => {
        const term = search.toLowerCase()
        return (
            (profile.full_name && profile.full_name.toLowerCase().includes(term)) ||
            (profile.email && profile.email.toLowerCase().includes(term)) ||
            (profile.document && profile.document.includes(term))
        )
    })

    return (
        <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Clientes Registrados ({filteredProfiles.length})</CardTitle>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-zinc-500" />
                    <Input
                        placeholder="Buscar por nome, email ou documento..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 bg-zinc-50/50"
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                            <TableHead>Usuário</TableHead>
                            <TableHead>Contato</TableHead>
                            <TableHead>Documento</TableHead>
                            <TableHead className="text-center">Tickets</TableHead>
                            <TableHead>Data Cadastro</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredProfiles.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center text-zinc-500">
                                    Nenhum cliente encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredProfiles.map((profile) => {
                                const initials = profile.full_name
                                    ? profile.full_name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase()
                                    : "??"

                                return (
                                    <TableRow key={profile.id} className="hover:bg-zinc-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9 border border-zinc-200">
                                                    <AvatarImage src={profile.avatar_url || undefined} />
                                                    <AvatarFallback className="bg-zinc-100 text-zinc-600 font-bold text-xs">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-[#0C0C0C]">{profile.full_name || "Sem Nome"}</span>
                                                    <Badge variant="outline" className="w-fit text-[10px] h-5 mt-1 border-zinc-300 text-zinc-500">
                                                        CLIENTE
                                                    </Badge>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-sm">
                                                <span className="text-zinc-700">{profile.email}</span>
                                                {profile.phone && (
                                                    <span className="text-zinc-500 text-xs">{profile.phone}</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="font-mono text-xs text-zinc-600">
                                            {profile.document || "-"}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="secondary" className="font-bold bg-zinc-100 text-zinc-700 hover:bg-zinc-200">
                                                {ticketCounts[profile.id] || 0}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-zinc-500 text-sm">
                                            {profile.created_at
                                                ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })
                                                : "-"
                                            }
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}
