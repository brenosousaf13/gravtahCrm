import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CalendarDays } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface TicketCardProps {
    id: string
    ticketNumber: number
    productName: string
    status: string
    createdAt: string
    brand: string
}

export function TicketCard({
    id,
    ticketNumber,
    productName,
    status,
    createdAt,
    brand,
}: TicketCardProps) {
    // Format date nicely
    const date = new Date(createdAt).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'novo':
                return 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200'
            case 'em_analise':
            case 'aguardando_resposta':
                return 'bg-blue-100 text-blue-700 hover:bg-blue-200 border-blue-200'
            case 'aprovado':
            case 'finalizado':
                return 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-200'
            case 'rejeitado':
                return 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200'
            default:
                return 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 border-zinc-200'
        }
    }

    return (
        <Link href={`/portal/tickets/${id}`} className="block h-full">
            <Card className="hover:shadow-md hover:border-zinc-400 transition-all cursor-pointer bg-white h-full flex flex-col justify-between group">
                <CardContent className="p-4">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                            #{ticketNumber}
                        </span>
                        <Badge
                            variant="outline"
                            className={cn(
                                "uppercase text-[10px] tracking-wide border px-1.5 py-0 font-bold transition-colors",
                                getStatusColor(status)
                            )}
                        >
                            {status.replace(/_/g, " ")}
                        </Badge>
                    </div>

                    <div className="mb-3">
                        <h3 className="font-bold text-base text-[#0C0C0C] uppercase leading-tight line-clamp-2 mb-0.5 group-hover:text-zinc-700 transition-colors">
                            {productName}
                        </h3>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                            {brand}
                        </span>
                    </div>

                    <div className="flex items-center text-zinc-400 text-[10px] pt-3 border-t border-zinc-50 mt-auto">
                        <CalendarDays className="w-3 h-3 mr-1.5" />
                        <span>{date}</span>
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
