"use client"

import { useState } from "react"
import { FileText, Loader2, Upload, Trash } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface TicketAttachmentsProps {
    ticketId: string
    attachments: any[]
    userId: string
    readOnly?: boolean
}

export function TicketAttachments({ ticketId, attachments, userId, readOnly = false }: TicketAttachmentsProps) {
    const [isUploading, setIsUploading] = useState(false)
    const [isDeleting, setIsDeleting] = useState("")
    const router = useRouter()

    const getPublicUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/warranty-files/${path}`

    const handleRemoveAttachment = async (e: React.MouseEvent, attachmentId: string, fileUrl: string) => {
        e.preventDefault()
        if (!confirm("Tem certeza que deseja remover este anexo? Essa ação não pode ser desfeita.")) return

        setIsDeleting(attachmentId)
        const supabase = createClient()
        try {
            // 1. Remove from Storage
            const { error: storageError } = await supabase.storage
                .from("warranty-files")
                .remove([fileUrl])

            if (storageError) {
                console.error("Storage delete error:", storageError)
            }

            // 2. Remove from DB
            const { error: dbError } = await supabase
                .from("ticket_attachments")
                .delete()
                .eq("id", attachmentId)

            if (dbError) throw dbError

            toast.success("Anexo removido com sucesso")
            router.refresh()
        } catch (error) {
            console.error("Error deleting attachment:", error)
            toast.error("Erro ao remover anexo")
        } finally {
            setIsDeleting("")
        }
    }

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) return

        setIsUploading(true)
        const supabase = createClient()
        const files = Array.from(e.target.files)
        let successCount = 0

        try {
            const uploadPromises = files.map(async (file, index) => {
                const fileExt = file.name.split('.').pop()
                const uniqueId = Math.random().toString(36).substring(7)
                // Usando userId passado via props para manter coerência, ou fallback para admin-uploads se necessário
                const fileName = `${userId}/${ticketId}/${Date.now()}_${index}_${uniqueId}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from("warranty-files")
                    .upload(fileName, file)

                if (uploadError) throw uploadError

                const { error: attachError } = await supabase.from("ticket_attachments").insert({
                    ticket_id: ticketId,
                    file_url: fileName,
                    file_type: file.type
                })

                if (attachError) throw attachError

                successCount++
            })

            await Promise.all(uploadPromises)

            toast.success(`${successCount} arquivos enviados com sucesso!`)
            router.refresh()

        } catch (error) {
            console.error("Erro ao enviar arquivos:", error)
            toast.error("Alguns arquivos não puderam ser enviados.")
        } finally {
            setIsUploading(false)
            e.target.value = ""
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-zinc-400 uppercase tracking-wider">
                    <FileText className="w-3 h-3" /> Arquivos ({attachments?.length || 0})
                </div>

                {!readOnly && (
                    <div className="relative">
                        <input
                            type="file"
                            multiple
                            className="hidden"
                            id="attachment-upload"
                            onChange={handleUpload}
                            disabled={isUploading}
                        />
                        <label
                            htmlFor="attachment-upload"
                            className={`
                                cursor-pointer flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider 
                                px-2 py-1 rounded bg-zinc-100 hover:bg-zinc-200 text-zinc-600 transition-colors
                                ${isUploading ? "opacity-50 pointer-events-none" : ""}
                            `}
                        >
                            {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                            {isUploading ? "Enviando..." : "Adicionar"}
                        </label>
                    </div>
                )}
            </div>

            {attachments && attachments.length > 0 ? (
                <div className="grid grid-cols-3 gap-2">
                    {attachments.map((file: any) => {
                        const publicUrl = getPublicUrl(file.file_url)
                        const isImage = file.file_type?.startsWith('image/')

                        return (
                            <div key={file.id} className="relative group">
                                <a
                                    href={publicUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block aspect-square rounded-md border border-zinc-200 overflow-hidden hover:border-zinc-900 transition-colors bg-white relative"
                                >
                                    {isImage ? (
                                        <img src={publicUrl} alt="File" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400">
                                            <FileText className="w-6 h-6" />
                                            <span className="text-[8px] uppercase font-bold mt-1 max-w-[90%] truncate">
                                                {file.file_type?.split('/')[1] || 'FILE'}
                                            </span>
                                        </div>
                                    )}
                                </a>
                                {!readOnly && (
                                    <button
                                        type="button"
                                        onClick={(e) => handleRemoveAttachment(e, file.id, file.file_url)}
                                        disabled={isDeleting === file.id}
                                        className="absolute top-1 right-1 bg-red-100/90 backdrop-blur-sm hover:bg-red-200 text-red-600 rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all z-10 disabled:opacity-50 shadow-sm"
                                        title="Remover anexo"
                                    >
                                        {isDeleting === file.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash className="w-3 h-3" />}
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            ) : (
                <p className="text-xs text-zinc-400 italic">Sem anexos.</p>
            )}
        </div>
    )
}
