"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

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

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        const supabase = createClient()

        try {
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
                                            <Input type="date" {...field} value={field.value || ""} />
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
