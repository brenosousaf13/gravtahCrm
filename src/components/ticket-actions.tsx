"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface TicketActionsProps {
    ticketId: string
    currentStatus: string
    currentSolution?: string | null
}

export function TicketActions({ ticketId, currentStatus, currentSolution }: TicketActionsProps) {
    const [status, setStatus] = useState(currentStatus)
    const [solution, setSolution] = useState(currentSolution || "")
    const [loading, setLoading] = useState(false)

    const supabase = createClient()
    const router = useRouter()

    const handleUpdate = async () => {
        setLoading(true)
        try {
            const { error } = await supabase
                .from("tickets")
                .update({
                    status: status,
                    solution: solution || null, // Only send solution if selected
                    updated_at: new Date().toISOString()
                })
                .eq("id", ticketId)

            if (error) throw error

            toast.success("Ticket atualizado com sucesso!")
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error("Erro ao atualizar ticket.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label className="uppercase text-xs font-bold text-zinc-500">Alterar Status</Label>
                <Select value={status} onValueChange={setStatus}>
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

            {/* Show Solution Select only if relevant statuses */}
            {['aprovado', 'finalizado', 'negado'].includes(status) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
                    <Label className="uppercase text-xs font-bold text-zinc-500">Definir Solução</Label>
                    <Select value={solution} onValueChange={setSolution}>
                        <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="credito">Crédito</SelectItem>
                            <SelectItem value="produto_trocado">Produto Trocado</SelectItem>
                            <SelectItem value="produto_reparado">Produto Reparado</SelectItem>
                            <SelectItem value="devolvido_cliente">Devolvido ao Cliente</SelectItem>
                            <SelectItem value="envio_pecas">Envio de Peças Sobressalentes</SelectItem>
                            <SelectItem value="negado">Negado</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            )}

            <Button
                className="w-full mt-2"
                onClick={handleUpdate}
                disabled={loading || (status === currentStatus && solution === currentSolution)}
            >
                {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
        </div>
    )
}
