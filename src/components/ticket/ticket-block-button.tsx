"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole, LockKeyholeOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { setTicketBlocked } from "@/app/actions/ticket-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface TicketBlockButtonProps {
    ticketId: string
    isBlocked: boolean
    compact?: boolean
}

export function TicketBlockButton({ ticketId, isBlocked, compact = false }: TicketBlockButtonProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const label = isBlocked ? "Desbloquear ticket" : "Bloquear ticket"
    const Icon = isBlocked ? LockKeyholeOpen : LockKeyhole

    const handleConfirm = async () => {
        if (loading) return
        setLoading(true)
        try {
            await setTicketBlocked(ticketId, !isBlocked)
            toast.success(isBlocked ? "Ticket desbloqueado." : "Ticket bloqueado.")
            setOpen(false)
            router.refresh()
        } catch {
            toast.error("Não foi possível alterar o bloqueio. Atualize a página e tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <Button
                variant={compact ? "ghost" : "outline"}
                size={compact ? "icon" : "sm"}
                className={compact ? "h-8 w-8" : "gap-2 shrink-0"}
                aria-label={label}
                title={label}
                onClick={() => setOpen(true)}
            >
                <Icon aria-hidden="true" className="h-4 w-4" />
                {!compact && <span>{label}</span>}
            </Button>
            <Dialog open={open} onOpenChange={(value) => { if (!loading) setOpen(value) }}>
                <DialogContent onEscapeKeyDown={(event) => { if (loading) event.preventDefault() }}>
                    <DialogHeader>
                        <DialogTitle>{label}?</DialogTitle>
                        <DialogDescription>
                            {isBlocked
                                ? "O cliente poderá voltar a enviar mensagens e gerenciar anexos neste atendimento."
                                : "O cliente poderá consultar o histórico, mas não poderá enviar mensagens nem adicionar ou remover anexos neste atendimento. Outros tickets continuarão disponíveis."}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>Cancelar</Button>
                        <Button variant={isBlocked ? "default" : "destructive"} disabled={loading} onClick={handleConfirm}>
                            {loading && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                            {loading ? "Salvando..." : label}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
