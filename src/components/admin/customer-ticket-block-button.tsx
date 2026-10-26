"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LockKeyhole, LockKeyholeOpen, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { setCustomerTicketCreationBlocked } from "@/app/actions/ticket-actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

export function CustomerTicketBlockButton({ customerId, customerName, isBlocked }: {
    customerId: string
    customerName: string | null
    isBlocked: boolean
}) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const router = useRouter()
    const label = isBlocked ? "Desbloquear cliente" : "Bloquear cliente"
    const Icon = isBlocked ? LockKeyholeOpen : LockKeyhole

    const confirm = async () => {
        if (loading) return
        setLoading(true)
        try {
            await setCustomerTicketCreationBlocked(customerId, !isBlocked)
            toast.success(isBlocked ? "Cliente liberado para abrir novos tickets." : "Cliente bloqueado para abrir novos tickets.")
            setOpen(false)
            router.refresh()
        } catch {
            toast.error("Não foi possível alterar o bloqueio do cliente. Atualize a página e tente novamente.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!loading) setOpen(value) }}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" aria-label={label}>
                    <Icon aria-hidden="true" className="h-4 w-4" />{label}
                </Button>
            </DialogTrigger>
            <DialogContent onEscapeKeyDown={(event) => { if (loading) event.preventDefault() }}>
                <DialogHeader>
                    <DialogTitle>{label}?</DialogTitle>
                    <DialogDescription>
                        {isBlocked
                            ? `${customerName || "Este cliente"} poderá voltar a abrir novos tickets.`
                            : `${customerName || "Este cliente"} não poderá abrir novos tickets até que você o desbloqueie manualmente. Os atendimentos existentes continuarão disponíveis.`}
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="outline" disabled={loading} onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button variant={isBlocked ? "default" : "destructive"} disabled={loading} onClick={confirm}>
                        {loading && <Loader2 aria-hidden="true" className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? "Salvando..." : label}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
