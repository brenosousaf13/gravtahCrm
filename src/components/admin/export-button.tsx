"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { toast } from "sonner"

interface ExportButtonProps {
    tickets: any[]
}

export function ExportButton({ tickets }: ExportButtonProps) {
    const handleExport = () => {
        try {
            if (!tickets || tickets.length === 0) {
                toast.error("Não há dados para exportar.")
                return
            }

            const baseUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/warranty-files/`

            // Find the maximum number of attachments across all tickets
            const maxAttachments = tickets.reduce((max, t) => {
                const count = t.ticket_attachments?.length || 0
                return count > max ? count : max
            }, 0)

            // Build attachment column headers ("Anexo 1", "Anexo 2", ...)
            const attachmentHeaders = Array.from({ length: maxAttachments }, (_, i) => `Anexo ${i + 1}`)

            const headers = [
                "Ticket Nº",
                "Data Abertura",
                "Cliente - Nome",
                "Cliente - Email",
                "Cliente - Documento",
                "Marca",
                "Modelo",
                "Produto",
                "Lote (Batch)",
                "Data Fabricação",
                "Status",
                "Solução",
                "Data Fechamento",
                ...attachmentHeaders
            ]

            // Map Data
            const rows = tickets.map(t => {
                // One URL per cell, padded with empty strings up to maxAttachments
                const attachmentCells = Array.from({ length: maxAttachments }, (_, i) => {
                    const file = t.ticket_attachments?.[i]
                    return file ? `${baseUrl}${file.file_url}` : ""
                })

                return [
                    t.ticket_number,
                    new Date(t.created_at).toLocaleString('pt-BR'),
                    t.profiles?.full_name || "N/A",
                    t.profiles?.email || "N/A",
                    t.profiles?.document || "N/A",
                    t.brand,
                    t.model,
                    t.product_name,
                    t.batch_number || "",
                    t.manufacturing_date || "",
                    t.status,
                    t.solution || "",
                    t.closed_at ? new Date(t.closed_at).toLocaleString('pt-BR') : "",
                    ...attachmentCells
                ]
            })

            // Convert to CSV String with Semicolon separator (Excel friendly in BR/EU)
            const csvContent = [
                headers.join(";"),
                ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
            ].join("\n")

            // Add BOM for UTF-8 Excel compatibility
            const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' })

            // Trigger Download
            const link = document.createElement("a")
            const url = URL.createObjectURL(blob)
            link.setAttribute("href", url)
            link.setAttribute("download", `relatorio_garantia_gravtah_${new Date().toISOString().split('T')[0]}.csv`)
            link.style.visibility = 'hidden'
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)

            toast.success("Relatório exportado com sucesso!")

        } catch (error) {
            console.error("Export error:", error)
            toast.error("Erro ao gerar relatório.")
        }
    }

    return (
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="w-4 h-4" />
            EXPORTAR RELATÓRIO
        </Button>
    )
}
