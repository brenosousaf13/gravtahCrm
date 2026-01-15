"use client"

import { useState } from "react"
import { updateTicketStatus } from "@/app/actions/ticket-actions"
import { toast } from "sonner"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function TicketStatusSelector({ ticketId, currentStatus }: { ticketId: string, currentStatus: string }) {
    const [status, setStatus] = useState(currentStatus)
    const [loading, setLoading] = useState(false)

    const handleUpdate = async (newStatus: string) => {
        setStatus(newStatus)
        setLoading(true)
        try {
            await updateTicketStatus(ticketId, newStatus)
            toast.success("Status atualizado")
        } catch (e) {
            toast.error("Erro ao atualizar status")
            setStatus(currentStatus) // Revert on error
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-2">
            <Label className="uppercase text-xs font-bold text-zinc-500">Alterar Status</Label>
            <Select value={status} onValueChange={handleUpdate} disabled={loading}>
                <SelectTrigger className="bg-white">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="novo">Novo</SelectItem>
                    <SelectItem value="aguardando_resposta">Aguardando Resposta</SelectItem>
                    <SelectItem value="aguardando_envio">Aguardando Envio</SelectItem>
                    <SelectItem value="em_analise">Em Análise</SelectItem>
                    <SelectItem value="aprovado">Aprovado</SelectItem>
                    <SelectItem value="negado">Negado</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                </SelectContent>
            </Select>
        </div>
    )
}
