import type { SupabaseClient } from "@supabase/supabase-js"
import { z } from "zod"

export const normalizedEmailSchema = z.string().trim().toLowerCase().email("E-mail inválido")

export const registrationSchema = z.object({
    full_name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres"),
    document: z.string().min(11, "Documento inválido"),
    phone: z.string().min(14, "Telefone inválido"),
    email: normalizedEmailSchema,
    confirmEmail: normalizedEmailSchema,
    password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string(),
}).refine(data => data.email === data.confirmEmail, {
    message: "Os e-mails não coincidem. Confira o endereço antes de cadastrar.", path: ["confirmEmail"],
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem", path: ["confirmPassword"],
})

export type RegistrationValues = z.infer<typeof registrationSchema>

function signupRedirect(origin: string) {
    return `${new URL(origin).origin}/auth/callback?next=/portal/dashboard`
}

export async function registerCustomer(auth: Pick<SupabaseClient["auth"], "signUp">, input: RegistrationValues, origin: string) {
    const data = registrationSchema.parse(input)
    const { data: result, error } = await auth.signUp({
        email: data.email,
        password: data.password,
        options: {
            emailRedirectTo: signupRedirect(origin),
            data: { full_name: data.full_name, document: data.document, phone: data.phone },
        },
    })
    if (error) throw error
    if (!result.user) throw new Error("Missing signup response")
    // handle_new_user creates the profile. A pending signup has no session,
    // so the browser must not attempt an unauthenticated profiles UPDATE.
    return { email: data.email, requiresConfirmation: !result.session }
}

export async function resendSignupConfirmation(auth: Pick<SupabaseClient["auth"], "resend">, email: string, origin: string) {
    const address = normalizedEmailSchema.parse(email)
    const { error } = await auth.resend({ type: "signup", email: address, options: { emailRedirectTo: signupRedirect(origin) } })
    if (error) throw error
}
