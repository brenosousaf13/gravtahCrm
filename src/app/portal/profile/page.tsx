"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function ProfilePage() {
    const supabase = createClient()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [formData, setFormData] = useState({
        full_name: "",
        email: "",
        document: "",
        phone: "",
    })

    useEffect(() => {
        const fetchProfile = async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) return

            const { data: profile } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", user.id)
                .single()

            if (profile) {
                setFormData({
                    full_name: profile.full_name || "",
                    email: profile.email || "", // Listed in profile or auth? Profile usually mimics it
                    document: profile.document || "",
                    phone: profile.phone || "",
                })
            }
            setLoading(false)
        }

        fetchProfile()
    }, [supabase])

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "")
        if (value.length > 11) value = value.slice(0, 11)

        // Phone Mask: (00) 00000-0000
        value = value.replace(/^(\d{2})(\d)/, "($1) $2")
        value = value.replace(/(\d{5})(\d)/, "$1-$2")

        setFormData({ ...formData, phone: value })
    }

    const onSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSaving(true)

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser()

            if (!user) throw new Error("Usuário não encontrado")

            const { error } = await supabase
                .from("profiles")
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone
                })
                .eq("id", user.id)

            if (error) throw error

            toast.success("Perfil atualizado com sucesso!")
        } catch (error) {
            console.error(error)
            toast.error("Erro ao atualizar perfil.")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
            </div>
        )
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8">
            <div className="space-y-1">
                <h1 className="text-3xl font-black uppercase tracking-tight text-[#0C0C0C]">
                    Meus Dados
                </h1>
                <p className="text-zinc-500">
                    Mantenha suas informações de contato atualizadas.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">Nome Completo</Label>
                                <Input
                                    id="full_name"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    required
                                    className="bg-zinc-50/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">WhatsApp / Telefone</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={handlePhoneChange}
                                    placeholder="(00) 00000-0000"
                                    required
                                    className="bg-zinc-50/50"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="document" className="text-zinc-400">CPF / CNPJ (Bloqueado)</Label>
                                <Input
                                    id="document"
                                    value={formData.document}
                                    disabled
                                    className="bg-zinc-100 text-zinc-500 cursor-not-allowed"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-zinc-400">Email (Bloqueado)</Label>
                                <Input
                                    id="email"
                                    value={formData.email}
                                    disabled
                                    className="bg-zinc-100 text-zinc-500 cursor-not-allowed"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <Button
                                type="submit"
                                className="bg-[#0C0C0C] hover:bg-zinc-800 text-white min-w-[150px]"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Salvando...
                                    </>
                                ) : "SALVAR ALTERAÇÕES"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}
