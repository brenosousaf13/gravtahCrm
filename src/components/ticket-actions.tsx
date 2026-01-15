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
        <Card className="border-l-4 border-l-zinc-900">
            <CardHeader>
                <CardTitle className="text-sm uppercase tracking-wider text-zinc-500">
                    Controles do Admin
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label>Alterar Status</Label>
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
                        <Label>Definir Solução</Label>
                        <Select value={solution} onValueChange={setSolution}>
                            <SelectTrigger className="bg-white">
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="troca">Troca</SelectItem>
                                <SelectItem value="reparo">Reparo</SelectItem>
                                <SelectItem value="credito">Crédito</SelectItem>
                                <SelectItem value="reembolso">Reembolso</SelectItem>
                                <SelectItem value="negado_justificado">Negado (Justificado)</SelectItem>
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
            </CardContent>
        </Card>
    )
}
