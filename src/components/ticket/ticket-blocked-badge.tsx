import { LockKeyhole } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function TicketBlockedBadge() {
    return (
        <Badge variant="outline" className="gap-1 bg-zinc-100 text-zinc-700 border-zinc-300 text-[10px] uppercase">
            <LockKeyhole aria-hidden="true" className="h-3 w-3" /> Bloqueado
        </Badge>
    )
}
