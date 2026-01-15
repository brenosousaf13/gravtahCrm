"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

// 1. Zod Schema
const registerSchema = z.object({
    full_name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    document: z.string().min(11, "Documento inválido"), // Basic length check, refined by usage
    phone: z.string().min(14, "Telefone inválido"), // (11) 99999-9999
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)

    // React Hook Form
    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormValues>({
        resolver: zodResolver(registerSchema),
    })

    // --- MASKS ---

    const handleDocumentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "")
        if (value.length > 14) value = value.slice(0, 14)

        if (value.length <= 11) {
            // CPF Mask: 000.000.000-00
            value = value.replace(/(\d{3})(\d)/, "$1.$2")
            value = value.replace(/(\d{3})(\d)/, "$1.$2")
            value = value.replace(/(\d{3})(\d{1,2})$/, "$1-$2")
        } else {
            // CNPJ Mask: 00.000.000/0000-00
            value = value.replace(/^(\d{2})(\d)/, "$1.$2")
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
            value = value.replace(/\.(\d{3})(\d)/, ".$1/$2")
            value = value.replace(/(\d{4})(\d)/, "$1-$2")
        }
        setValue("document", value)
    }

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, "")
        if (value.length > 11) value = value.slice(0, 11)

        // Phone Mask: (00) 00000-0000
        value = value.replace(/^(\d{2})(\d)/, "($1) $2")
        value = value.replace(/(\d{5})(\d)/, "$1-$2")

        setValue("phone", value)
    }

    const onSubmit = async (data: RegisterFormValues) => {
        setLoading(true)
        try {
            // 1. SignUp with Meta Data
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.full_name,
                        document: data.document,
                        phone: data.phone,
                    },
                },
            })

            if (authError) throw authError

            // 2. Update Profile (Redundant but ensures sync if trigger fails/delays)
            if (authData.user) {
                const { error: profileError } = await supabase
                    .from("profiles")
                    .update({
                        full_name: data.full_name,
                        document: data.document,
                        phone: data.phone,
                    })
                    .eq("id", authData.user.id)

                if (profileError) {
                    console.warn("Manual profile update failed (Trigger might have handled it):", profileError)
                }
            }

            toast.success("Conta criada com sucesso!")

            if (authData.session) {
                router.push("/portal/dashboard")
            } else {
                toast.info("Verifique seu email para confirmar o cadastro.")
                router.push("/login")
            }
        } catch (error: any) {
            console.error(error)
            toast.error(error.message || "Erro ao criar conta.")
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md bg-white border-zinc-200 shadow-sm p-0 overflow-hidden">
                <CardHeader className="bg-white border-b border-zinc-100 pb-6 pt-8 text-center">
                    <CardTitle className="text-3xl font-black tracking-tighter text-[#0C0C0C]">
                        GRAVTAH
                    </CardTitle>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">
                        Crie sua conta
                    </p>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="full_name">Nome Completo</Label>
                            <Input
                                id="full_name"
                                placeholder="Ex: João da Silva"
                                {...register("full_name")}
                                className="bg-zinc-50/50"
                            />
                            {errors.full_name && <p className="text-xs text-red-500">{errors.full_name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="document">CPF ou CNPJ</Label>
                            <Input
                                id="document"
                                placeholder="000.000.000-00"
                                maxLength={18}
                                {...register("document")}
                                onChange={handleDocumentChange}
                                className="bg-zinc-50/50"
                            />
                            {errors.document && <p className="text-xs text-red-500">{errors.document.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">WhatsApp / Telefone</Label>
                            <Input
                                id="phone"
                                placeholder="(00) 00000-0000"
                                maxLength={15}
                                {...register("phone")}
                                onChange={handlePhoneChange}
                                className="bg-zinc-50/50"
                            />
                            {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="seu@email.com"
                                {...register("email")}
                                className="bg-zinc-50/50"
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="••••••"
                                    {...register("password")}
                                    className="bg-zinc-50/50"
                                />
                                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword">Confirmar</Label>
                                <Input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••"
                                    {...register("confirmPassword")}
                                    className="bg-zinc-50/50"
                                />
                                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-sm mt-4"
                            disabled={loading}
                        >
                            {loading ? "Criando conta..." : "CADASTRAR"}
                        </Button>
                    </form>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-zinc-500">Já tem conta? </span>
                        <Link
                            href="/login"
                            className="font-bold text-[#0C0C0C] hover:underline uppercase text-xs"
                        >
                            Fazer Login
                        </Link>
                    </div>
                </CardContent>
            </Card>

            <div className="absolute bottom-6 text-center text-xs text-zinc-400 uppercase font-medium">
                &copy; {new Date().getFullYear()} Gravtah Performance
            </div>
        </div>
    )
}
