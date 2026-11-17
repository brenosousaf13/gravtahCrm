"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createClient } from "@/lib/supabase/client"
import { normalizedEmailSchema, resendSignupConfirmation } from "@/lib/auth/registration"
import { getAuthErrorMessage } from "@/lib/auth/errors"
import { getEmailCooldownSeconds, startEmailCooldown, useEmailCooldown } from "@/lib/auth/email-cooldown"

export function EmailConfirmation({ email: initialEmail = "", onCorrectEmail }: { email?: string; onCorrectEmail?: () => void }) {
    const [email, setEmail] = useState(initialEmail)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [notice, setNotice] = useState("")
    const sending = useRef(false)
    const cooldown = useEmailCooldown()

    const resend = async (event: React.FormEvent) => {
        event.preventDefault()
        if (sending.current) return
        if (getEmailCooldownSeconds() > 0) {
            setError("Aguarde o intervalo indicado antes de solicitar outro e-mail.")
            return
        }
        const parsed = normalizedEmailSchema.safeParse(email)
        if (!parsed.success) { setError("Informe um e-mail válido para reenviar a confirmação."); return }
        sending.current = true
        setLoading(true)
        setError("")
        setNotice("")
        startEmailCooldown()
        try {
            await resendSignupConfirmation(createClient().auth, parsed.data, window.location.origin)
            setNotice("Se esse e-mail estiver aguardando confirmação, você receberá um novo link. Confira também a pasta de spam. Se a conta já estiver confirmada, faça login ou recupere sua senha.")
        } catch (cause) {
            setError(getAuthErrorMessage(cause, "Não foi possível reenviar a confirmação. Tente novamente mais tarde."))
        } finally {
            sending.current = false
            setLoading(false)
        }
    }

    return (
        <div className="space-y-5">
            <div className="space-y-2">
                <h2 className="text-lg font-bold text-zinc-900">Confirme seu e-mail</h2>
                <p className="text-sm text-zinc-600">Para entrar, abra o link de confirmação recebido no seu e-mail. Confira o endereço e verifique a caixa de entrada e a pasta de spam.</p>
                {initialEmail && <p className="break-all font-semibold text-zinc-900">{initialEmail}</p>}
            </div>
            <form onSubmit={resend} className="space-y-3">
                {initialEmail ? <input type="hidden" value={email} readOnly /> : (
                    <div className="space-y-2">
                        <Label htmlFor="confirmation-email">E-mail cadastrado</Label>
                        <Input id="confirmation-email" type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" autoCapitalize="none" spellCheck={false} required disabled={loading} />
                    </div>
                )}
                {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
                {notice && <p role="status" className="text-sm text-zinc-700">{notice}</p>}
                <Button type="submit" className="w-full" disabled={loading || cooldown > 0}>
                    {loading ? "Reenviando..." : cooldown > 0 ? `Reenviar em ${cooldown}s` : "Reenviar confirmação"}
                </Button>
            </form>
            {onCorrectEmail ? (
                <Button type="button" variant="outline" className="w-full" onClick={onCorrectEmail} disabled={loading}>Corrigir e-mail</Button>
            ) : (
                <Link href="/register" className="block text-sm font-semibold underline underline-offset-4">Digitou o e-mail errado? Refazer cadastro</Link>
            )}
            <p className="text-xs text-zinc-600">Para usar um endereço diferente, refaça o cadastro com o e-mail correto. Não é necessário apagar o cadastro anterior para solicitar uma nova confirmação.</p>
            <div className="flex flex-wrap justify-between gap-3 text-sm">
                <Link href="/login" className="font-semibold underline underline-offset-4">Fazer login</Link>
                <Link href="/forgot-password" className="underline underline-offset-4">Recuperar senha</Link>
            </div>
        </div>
    )
}
