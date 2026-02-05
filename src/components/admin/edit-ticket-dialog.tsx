"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2, Trash } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    product_name: z.string().min(3, "Nome do produto é obrigatório"),
    brand: z.string().min(1, "Selecione a marca"),
    model: z.string().min(1, "Modelo é obrigatório"),
    sku: z.string().optional().nullable(),
    batch_number: z.string().optional().nullable(),
    manufacturing_date: z.string().optional().nullable(),
    issue_description: z.string().min(20, "Descreva o problema com pelo menos 20 caracteres"),
})

interface Ticket {
    id: string
    ticket_number: number
    product_name: string
    brand: string
    model: string
    sku: string | null
    batch_number: string | null
    manufacturing_date: string | null
    issue_description: string
    ticket_attachments?: any[]
}

interface EditTicketDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ticket: Ticket
    onSuccess: () => void
}

export function EditTicketDialog({
    open,
    onOpenChange,
    ticket,
    onSuccess,
}: EditTicketDialogProps) {
    const [isLoading, setIsLoading] = useState(false)
    const [newFiles, setNewFiles] = useState<File[]>([])
    const [existingAttachments, setExistingAttachments] = useState<any[]>(ticket.ticket_attachments || [])

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            product_name: ticket.product_name || "",
            brand: ticket.brand || "",
            model: ticket.model || "",
            sku: ticket.sku || "",
            batch_number: ticket.batch_number || "",
            manufacturing_date: ticket.manufacturing_date || "",
            issue_description: ticket.issue_description || "",
        },
    })

    // Helper for public URLs
    const getPublicUrl = (path: string) => `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/warranty-files/${path}`

    const handleRemoveAttachment = async (attachmentId: string, fileUrl: string) => {
        if (!confirm("Tem certeza que deseja remover este anexo? Essa ação não pode ser desfeita.")) return

        const supabase = createClient()
        try {
            // 1. Remove from Storage
            const { error: storageError } = await supabase.storage
                .from("warranty-files")
                .remove([fileUrl])

            if (storageError) {
                console.error("Storage delete error:", storageError)
                // Continue anyway to remove from DB if it was a ghost file or similar
            }

            // 2. Remove from DB
            const { error: dbError } = await supabase
                .from("ticket_attachments")
                .delete()
                .eq("id", attachmentId)

            if (dbError) throw dbError

            // 3. Update State
            setExistingAttachments(prev => prev.filter(a => a.id !== attachmentId))
            toast.success("Anexo removido com sucesso")
        } catch (error) {
            console.error("Error deleting attachment:", error)
            toast.error("Erro ao remover anexo")
        }
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        const supabase = createClient()

        try {
            // 1. Update Ticket Data
            const { error } = await supabase
                .from("tickets")
                .update({
                    product_name: values.product_name,
                    brand: values.brand,
                    model: values.model,
                    sku: values.sku || null,
                    batch_number: values.batch_number || null,
                    manufacturing_date: values.manufacturing_date || null,
                    issue_description: values.issue_description,
                })
                .eq("id", ticket.id)

            if (error) throw error

            // 2. Upload New Files
            if (newFiles.length > 0) {
                const uploadPromises = newFiles.map(async (file, index) => {
                    const fileExt = file.name.split('.').pop()
                    const uniqueId = Math.random().toString(36).substring(7)
                    // fileUrl structure: userId/ticketId/timestamp_index_uniqueId.ext
                    // We don't have easy access to userId here without fetching, but we can assume we might not need strict user pathing for admin edits, 
                    // OR we just use the ticket's user_id if we had it. 
                    // Let's use a generic 'admin-upload' folder or similar if user_id isn't available, BUT ticket HAS user_id in DB.
                    // Ideally we should keep the same structure. 
                    // Let's assume we can put it in `admin-uploads/${ticket.id}/...` or try to keep consistency.
                    // For simplicity and permission safety, let's use the ticket ID as the main folder if possible, or just a flat structure.
                    // The previous upload logic used `user.id/ticketId/...`.
                    // We will use `admin-uploads/${ticket.id}/...` to avoid auth/RLS issues if we don't have the original user ID.

                    const fileName = `admin-uploads/${ticket.id}/${Date.now()}_${index}_${uniqueId}.${fileExt}`

                    const { error: uploadError } = await supabase.storage
                        .from("warranty-files")
                        .upload(fileName, file)

                    if (uploadError) throw uploadError

                    const { error: attachError } = await supabase.from("ticket_attachments").insert({
                        ticket_id: ticket.id,
                        file_url: fileName,
                        file_type: file.type
                    })

                    if (attachError) throw attachError
                })

                await Promise.all(uploadPromises)
            }

            toast.success(`Ticket #${ticket.ticket_number} atualizado com sucesso`)
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error updating ticket:", error)
            toast.error("Erro ao atualizar ticket")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Ticket #{ticket.ticket_number}</DialogTitle>
                    <DialogDescription>
                        Faça alterações nas informações do ticket aqui.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* ... Existing Fields ... */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Marca</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="MET">MET</SelectItem>
                                                <SelectItem value="Hutchinson">Hutchinson</SelectItem>
                                                <SelectItem value="Look">Look</SelectItem>
                                                <SelectItem value="Corima">Corima</SelectItem>
                                                <SelectItem value="Scicon">Scicon</SelectItem>
                                                <SelectItem value="Fulcrum">Fulcrum</SelectItem>
                                                <SelectItem value="Velotoze">Velotoze</SelectItem>
                                                <SelectItem value="Supacaz">Supacaz</SelectItem>
                                                <SelectItem value="Wahoo">Wahoo</SelectItem>
                                                <SelectItem value="Outros">Outros</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="model"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Modelo</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Modelo do produto" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="product_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome do Produto (Descritivo)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Capacete MET Trenta White L" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <FormField
                                control={form.control}
                                name="sku"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>SKU</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Código SKU" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="batch_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Lote (Batch)</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nº do Lote" {...field} value={field.value || ""} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="manufacturing_date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Data Fabricação</FormLabel>
                                        <FormControl>
                                            <Input type="month" {...field} value={field.value ? field.value.substring(0, 7) : ""} onChange={(e) => field.onChange(`${e.target.value}-01`)} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="issue_description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Descrição do Problema</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Descreva o problema..."
                                            className="min-h-[100px]"
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Attachments Section */}
                        <div className="space-y-3 pt-2">
                            <h4 className="text-sm font-medium">Anexos ({existingAttachments.length})</h4>

                            {/* Existing File List */}
                            {existingAttachments.length > 0 && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                    {existingAttachments.map((att) => (
                                        <div key={att.id} className="relative group border rounded-md p-2 flex flex-col items-center justify-center bg-zinc-50 aspect-square">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveAttachment(att.id, att.file_url)}
                                                className="absolute top-1 right-1 bg-red-100 hover:bg-red-200 text-red-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Trash className="w-3 h-3" />
                                            </button>
                                            <span className="text-[10px] text-zinc-500 truncate max-w-full text-center px-1">
                                                {att.file_url.split('/').pop()}
                                            </span>
                                            <a href={getPublicUrl(att.file_url)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1">
                                                Ver
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* New File Upload */}
                            <div className="border-2 border-dashed border-zinc-200 rounded-md p-4 text-center hover:bg-zinc-50 transition-colors">
                                <Input
                                    type="file"
                                    multiple
                                    className="hidden"
                                    id="admin-file-upload"
                                    onChange={(e) => {
                                        if (e.target.files) {
                                            setNewFiles(prev => [...prev, ...Array.from(e.target.files || [])])
                                        }
                                    }}
                                />
                                <label htmlFor="admin-file-upload" className="cursor-pointer flex flex-col items-center gap-1">
                                    <span className="text-sm font-medium text-zinc-600">Adicionar novos anexos</span>
                                    <span className="text-xs text-zinc-400">Clique para selecionar arquivos</span>
                                </label>
                            </div>

                            {/* New Files Preview */}
                            {newFiles.length > 0 && (
                                <div className="space-y-1">
                                    <p className="text-xs font-medium text-green-600">Novos arquivos para enviar:</p>
                                    <ul className="text-xs text-zinc-600 list-disc pl-4">
                                        {newFiles.map((f, i) => (
                                            <li key={i} className="flex items-center justify-between">
                                                {f.name}
                                                <button type="button" onClick={() => setNewFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-500 ml-2">Remover</button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Salvar Alterações
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
