"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { EmailConfirmation } from "@/components/auth/email-confirmation"
import { registrationSchema, registerCustomer, type RegistrationValues } from "@/lib/auth/registration"
import { getAuthErrorMessage, isAuthRateLimit } from "@/lib/auth/errors"
import { getEmailCooldownSeconds, startEmailCooldown, useEmailCooldown } from "@/lib/auth/email-cooldown"

export default function RegisterPage() {
    const router = useRouter()
    const supabase = createClient()
    const [loading, setLoading] = useState(false)
    const [pendingEmail, setPendingEmail] = useState("")
    const [submitError, setSubmitError] = useState("")
    const submitting = useRef(false)
    const cooldown = useEmailCooldown()

    // React Hook Form
    const {
        register,
        handleSubmit,
        setValue,
        setFocus,
        formState: { errors },
    } = useForm<RegistrationValues>({
        resolver: zodResolver(registrationSchema),
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

    const onSubmit = async (data: RegistrationValues) => {
        if (submitting.current) return
        if (getEmailCooldownSeconds() > 0) {
            setSubmitError("Aguarde o intervalo indicado antes de tentar novamente.")
            return
        }
        submitting.current = true
        setLoading(true)
        setSubmitError("")
        try {
            startEmailCooldown()
            const result = await registerCustomer(supabase.auth, data, window.location.origin)
            if (!result.requiresConfirmation) {
                toast.success("Conta criada com sucesso!")
                router.push("/portal/dashboard")
            } else {
                setValue("password", "")
                setValue("confirmPassword", "")
                setPendingEmail(result.email)
            }
        } catch (error) {
            if (isAuthRateLimit(error)) startEmailCooldown()
            setSubmitError(getAuthErrorMessage(error, "Não foi possível criar a conta. Confira os dados e tente novamente."))
        } finally {
            submitting.current = false
            setLoading(false)
        }
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-zinc-100 px-4 py-8">
            <Card className="w-full max-w-md bg-white border-zinc-200 shadow-sm p-0 overflow-hidden">
                <CardHeader className="bg-white border-b border-zinc-100 pb-6 pt-8 text-center">
                    <CardTitle className="text-3xl font-black tracking-tighter text-[#0C0C0C]">
                        GRAVTAH
                    </CardTitle>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">
                        Crie sua conta
                    </p>
                </CardHeader>
                <CardContent className="p-6 sm:p-8">
                    {pendingEmail ? <EmailConfirmation email={pendingEmail} onCorrectEmail={() => {
                        setPendingEmail("")
                        setSubmitError("")
                        setValue("confirmEmail", "")
                        window.setTimeout(() => setFocus("email"), 0)
                    }} /> : <>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <fieldset disabled={loading} className="space-y-4">
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
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="seu@email.com"
                                {...register("email")}
                                className="bg-zinc-50/50"
                            />
                            {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmEmail">Confirmar e-mail</Label>
                            <Input id="confirmEmail" type="email" autoComplete="off" autoCapitalize="none" spellCheck={false} placeholder="Digite seu e-mail novamente" {...register("confirmEmail")} className="bg-zinc-50/50" aria-invalid={!!errors.confirmEmail} aria-describedby={errors.confirmEmail ? "confirm-email-error" : undefined} />
                            {errors.confirmEmail && <p id="confirm-email-error" className="text-xs text-red-700">{errors.confirmEmail.message}</p>}
                            <p className="text-xs text-zinc-600">O link para ativar sua conta será enviado para esse endereço.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="password">Senha</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    autoComplete="new-password"
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
                                    autoComplete="new-password"
                                    placeholder="••••••"
                                    {...register("confirmPassword")}
                                    className="bg-zinc-50/50"
                                />
                                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                            </div>
                        </div>

                        {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}
                        <Button
                            type="submit"
                            className="w-full h-12 text-sm mt-4"
                            disabled={loading || cooldown > 0}
                        >
                            {loading ? "Criando conta..." : cooldown > 0 ? `Aguarde ${cooldown}s` : "CADASTRAR"}
                        </Button>
                        </fieldset>
                    </form>

                    <Link href="/auth/confirm-email" className="mt-4 block text-center text-sm underline underline-offset-4">Não recebeu o e-mail de confirmação?</Link>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-zinc-500">Já tem conta? </span>
                        <Link
                            href="/login"
                            className="font-bold text-[#0C0C0C] hover:underline uppercase text-xs"
                        >
                            Fazer Login
                        </Link>
                    </div>
                    </>}
                </CardContent>
            </Card>

            <div className="text-center text-xs text-zinc-500 uppercase font-medium">
                &copy; {new Date().getFullYear()} Gravtah Performance
            </div>
        </div>
    )
}
