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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

const formSchema = z.object({
    full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    document: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    role: z.string().min(1, "Função é obrigatória"),
})

interface Profile {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
    document: string | null
    avatar_url: string | null
    created_at: string
    role?: string
}

interface EditCustomerDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    customer: Profile
    onSuccess: () => void
}

export function EditCustomerDialog({
    open,
    onOpenChange,
    customer,
    onSuccess,
}: EditCustomerDialogProps) {
    const [isLoading, setIsLoading] = useState(false)

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: customer.full_name || "",
            email: customer.email || "",
            document: customer.document || "",
            phone: customer.phone || "",
            role: customer.role || "cliente",
        },
    })

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setIsLoading(true)
        const supabase = createClient()

        try {
            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: values.full_name,
                    email: values.email,
                    document: values.document || null,
                    phone: values.phone || null,
                    role: values.role,
                })
                .eq("id", customer.id)

            if (error) throw error

            toast.success("Usuário atualizado com sucesso")
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error("Erro ao atualizar usuário")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                    <DialogDescription>
                        Faça alterações nas informações do usuário aqui. Clique em salvar quando terminar.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do usuário" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="document"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CPF/CNPJ</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="000.000.000-00"
                                                {...field}
                                                value={field.value || ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Telefone</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="(00) 00000-0000"
                                                {...field}
                                                value={field.value || ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="role"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Função</FormLabel>
                                    <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione uma função" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="cliente">Cliente</SelectItem>
                                            <SelectItem value="admin">Administrador</SelectItem>
                                        </SelectContent>
                                    </Select>
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
