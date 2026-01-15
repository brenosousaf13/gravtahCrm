"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useForm, useWatch } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Info, Upload, AlertTriangle, Paperclip, X, FileText } from "lucide-react"

// 1. Zod Schema
const ticketSchema = z
    .object({
        product_name: z.string().min(3, "Nome do produto é obrigatório"),
        brand: z.string().min(1, "Selecione a marca"),
        model: z.string().min(1, "Modelo é obrigatório"),
        sku: z.string().optional(),
        issue_description: z
            .string()
            .min(20, "Descreva o problema com pelo menos 20 caracteres"),
        // Conditional fields (initially optional)
        batch_number: z.string().optional(),
        manufacturing_date: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        // CONDITIONAL LOGIC: If Brand is MET or Hutchinson, batch/date are REQUIRED
        if (["MET", "Hutchinson"].includes(data.brand)) {
            if (!data.batch_number || data.batch_number.length < 3) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Número de lote é obrigatório para esta marca",
                    path: ["batch_number"],
                })
            }
            if (!data.manufacturing_date) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Data de fabricação é obrigatória",
                    path: ["manufacturing_date"],
                })
            }
        }
    })

type TicketFormValues = z.infer<typeof ticketSchema>

export default function NewTicketPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [files, setFiles] = useState<File[]>([])

    // Ref for the hidden file input
    const fileInputRef = useRef<HTMLInputElement>(null)

    const form = useForm<TicketFormValues>({
        resolver: zodResolver(ticketSchema),
        defaultValues: {
            product_name: "",
            brand: "",
            model: "",
            sku: "",
            issue_description: "",
            batch_number: "",
            manufacturing_date: "",
        },
    })

    // Watch brand for conditional rendering
    const selectedBrand = useWatch({
        control: form.control,
        name: "brand",
    })

    const isRestrictedBrand = ["MET", "Hutchinson"].includes(selectedBrand)

    // ACCUMULATIVE FILE ADDITION
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files)
            setFiles((prev) => [...prev, ...newFiles])

            // Clear input value to allow selecting the same file again if needed
            if (fileInputRef.current) {
                fileInputRef.current.value = ""
            }
        }
    }

    // FILE REMOVAL
    const removeFile = (indexToRemove: number) => {
        setFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
    }

    const triggerFileInput = () => {
        fileInputRef.current?.click()
    }

    const onSubmit = async (data: TicketFormValues) => {
        setLoading(true)
        try {
            // 1. Get User
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) {
                toast.error("Sua sessão expirou. Faça login novamente.")
                router.push("/login")
                return
            }

            if (files.length === 0) {
                toast.error("Por favor, anexe a Nota Fiscal ou evidências.")
                setLoading(false)
                return
            }

            // 2. Insert Ticket
            const { data: ticketData, error: ticketError } = await supabase
                .from("tickets")
                .insert({
                    user_id: user.id,
                    status: "novo",
                    product_name: data.product_name,
                    brand: data.brand,
                    model: data.model,
                    sku: data.sku,
                    issue_description: data.issue_description,
                    batch_number: data.batch_number || null,
                    manufacturing_date: data.manufacturing_date || null,
                })
                .select()
                .single()

            if (ticketError) throw ticketError

            const ticketId = ticketData.id

            // 3. Upload ALL Files
            const uploadPromises = files.map(async (file, index) => {
                const fileExt = file.name.split('.').pop()
                const uniqueId = Math.random().toString(36).substring(7)
                const fileName = `${user.id}/${ticketId}/${Date.now()}_${index}_${uniqueId}.${fileExt}`

                const { error: uploadError } = await supabase.storage
                    .from("warranty-files")
                    .upload(fileName, file)

                if (uploadError) {
                    console.error(`Error uploading ${file.name}:`, uploadError)
                    return null
                }

                // Insert into attachment table
                // Note: We use the PATH as file_url to be consistent with existing display logic
                const { error: attachError } = await supabase.from("ticket_attachments").insert({
                    ticket_id: ticketId,
                    file_url: fileName,
                    file_type: file.type
                })

                if (attachError) console.error(`Error linking ${file.name}:`, attachError)

                return fileName
            })

            await Promise.all(uploadPromises)

            toast.success(`Chamado #${ticketData.ticket_number} criado com sucesso!`)
            router.push("/portal/dashboard")

        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Erro ao criar ticket.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-[#0C0C0C]">
                    Abrir Solicitação
                </h1>
                <p className="text-zinc-500">
                    Preencha os dados abaixo para iniciar o processo de garantia.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados do Produto</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                        {/* Row 1 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Marca *</Label>
                                <Select
                                    onValueChange={(val) => form.setValue("brand", val)}
                                    defaultValue={form.getValues("brand")}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MET">MET</SelectItem>
                                        <SelectItem value="Hutchinson">Hutchinson</SelectItem>
                                        <SelectItem value="Look">Look</SelectItem>
                                        <SelectItem value="Corima">Corima</SelectItem>
                                        <SelectItem value="Scicon">Scicon</SelectItem>
                                        <SelectItem value="Fulcrum">Fulcrum</SelectItem>
                                        <SelectItem value="Outros">Outros</SelectItem>
                                    </SelectContent>
                                </Select>
                                {/* Form Error Handling for Brand */}
                                {form.formState.errors.brand && (
                                    <p className="text-xs text-red-500">{form.formState.errors.brand.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Modelo *</Label>
                                <Input {...form.register("model")} placeholder="Ex: Trenta 3K Carbon" />
                                {form.formState.errors.model && (
                                    <p className="text-xs text-red-500">{form.formState.errors.model.message}</p>
                                )}
                            </div>
                        </div>

                        {/* Restricted Info Alert */}
                        {isRestrictedBrand && (
                            <Alert variant="warning" className="animate-in fade-in slide-in-from-top-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertTitle className="uppercase font-bold text-xs">Atenção Necessária</AlertTitle>
                                <AlertDescription>
                                    Para produtos <strong>{selectedBrand}</strong>, é obrigatório informar o número de lote (Batch) e a data de fabricação.
                                    <br />
                                    <span className="text-xs opacity-80 mt-1 block">
                                        Geralmente encontrados em uma etiqueta na parte interna ou caixa.
                                    </span>
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Restricted Fields */}
                        {isRestrictedBrand && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-zinc-50 rounded-md border border-zinc-100">
                                <div className="space-y-2">
                                    <Label className="text-amber-700">Batch Number (Lote) *</Label>
                                    <Input {...form.register("batch_number")} placeholder="Ex: 123456" className="bg-white" />
                                    {form.formState.errors.batch_number && (
                                        <p className="text-xs text-red-500">{form.formState.errors.batch_number.message}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-amber-700">Data de Fabricação *</Label>
                                    <Input type="date" {...form.register("manufacturing_date")} className="bg-white" />
                                    {form.formState.errors.manufacturing_date && (
                                        <p className="text-xs text-red-500">{form.formState.errors.manufacturing_date.message}</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Row 2 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Nome do Produto (Descritivo) *</Label>
                                <Input {...form.register("product_name")} placeholder="Ex: Capacete MET Trenta White L" />
                                {form.formState.errors.product_name && (
                                    <p className="text-xs text-red-500">{form.formState.errors.product_name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>SKU (Opcional)</Label>
                                <Input {...form.register("sku")} placeholder="Código do produto" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Descrição do Problema *</Label>
                            <Textarea
                                {...form.register("issue_description")}
                                placeholder="Descreva detalhadamente o defeito apresentado..."
                                className="min-h-[120px]"
                            />
                            {form.formState.errors.issue_description && (
                                <p className="text-xs text-red-500">{form.formState.errors.issue_description.message}</p>
                            )}
                        </div>

                        {/* IMPROVED FILE UPLOAD SECTION */}
                        <div className="space-y-4 pt-4 border-t border-zinc-100">
                            <div className="flex items-center justify-between">
                                <Label className="flex items-center gap-2">
                                    <Paperclip className="w-4 h-4" /> Evidências / Nota Fiscal
                                </Label>
                                <span className="text-xs text-zinc-400">
                                    {files.length} arquivo(s)
                                </span>
                            </div>

                            <div className="space-y-3">
                                {/* Custom Trigger Button */}
                                <Input
                                    type="file"
                                    multiple
                                    accept="image/*,application/pdf,text/xml,application/xml"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                />

                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={triggerFileInput}
                                    className="w-full border-dashed border-2 border-zinc-200 bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-zinc-600 h-16"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    ADICIONAR ARQUIVOS
                                </Button>

                                {/* File List */}
                                {files.length > 0 && (
                                    <div className="grid gap-2">
                                        {files.map((f, i) => (
                                            <div key={i} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-md shadow-sm group">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className="h-8 w-8 rounded bg-zinc-100 flex items-center justify-center shrink-0">
                                                        <FileText className="w-4 h-4 text-zinc-500" />
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="text-sm font-medium truncate">{f.name}</span>
                                                        <span className="text-[10px] text-zinc-400 uppercase">
                                                            {(f.size / 1024 / 1024).toFixed(2)} MB
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-zinc-400 hover:text-red-500 hover:bg-red-50"
                                                    onClick={() => removeFile(i)}
                                                >
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="pt-4">
                            <Button type="submit" className="w-full md:w-auto md:min-w-[200px]" disabled={loading} size="lg">
                                {loading ? "Enviando..." : "ENVIAR SOLICITAÇÃO"}
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
