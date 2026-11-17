"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { normalizedEmailSchema } from "@/lib/auth/registration";
import { getEmailCooldownSeconds, startEmailCooldown, useEmailCooldown } from "@/lib/auth/email-cooldown";

export default function ForgotPasswordPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [isSent, setIsSent] = useState(false);
    const [resetError, setResetError] = useState("");
    const cooldown = useEmailCooldown();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email || loading) return;
        if (getEmailCooldownSeconds() > 0) {
            setResetError("Aguarde o intervalo indicado antes de solicitar outro e-mail.");
            return;
        }

        setLoading(true);
        setResetError("");

        try {
            const address = normalizedEmailSchema.parse(email);
            // 1. Check if email exists using RPC (bypasses RLS)
            const { data: exists, error: rpcError } = await supabase.rpc("check_email_exists", {
                lookup_email: address,
            });

            if (rpcError || !exists) {
                // Return generic message as requested
                throw new Error("Este e-mail não está cadastrado na plataforma.");
            }

            // 2. Send reset email via Supabase Auth
            startEmailCooldown();
            const { error: authError } = await supabase.auth.resetPasswordForEmail(address, {
                redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
            });

            if (authError) {
                throw authError; // Supabase handles rate limits, etc.
            }

            toast.success("E-mail de redefinição enviado com sucesso!");
            setIsSent(true);
        } catch (error) {
            setResetError(getAuthErrorMessage(error, "Não foi possível solicitar a recuperação. Confira o e-mail e tente novamente."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md bg-white border-zinc-200 shadow-sm p-0 overflow-hidden">
                <CardHeader className="bg-white border-b border-zinc-100 pb-6 pt-8 text-center relative">
                    <Link href="/login" className="absolute left-6 top-8 text-zinc-400 hover:text-black transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <CardTitle className="text-3xl font-black tracking-tighter text-[#0C0C0C]">
                        GRAVTAH
                    </CardTitle>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">
                        Recuperação de Senha
                    </p>
                </CardHeader>
                <CardContent className="p-8">
                    {isSent ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                            </div>
                            <h3 className="font-bold text-lg">E-mail Enviado!</h3>
                            <p className="text-sm text-zinc-500">
                                Enviamos um link de recuperação para <strong>{email}</strong>. Por favor, verifique sua caixa de entrada e spam.
                            </p>
                            <Button
                                variant="outline"
                                className="w-full mt-4"
                                onClick={() => router.push("/login")}
                            >
                                Voltar para o Login
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleReset} className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-sm text-zinc-500 mb-4 text-center">
                                    Digite seu e-mail cadastrado e enviaremos instruções para redefinir sua senha.
                                </p>
                                <Label htmlFor="email">Email Cadastrado</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="seu@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="bg-zinc-50/50"
                                    disabled={loading}
                                />
                            </div>

                            {resetError && <p role="alert" className="text-sm text-red-700">{resetError}</p>}
                            <Button
                                type="submit"
                                className="w-full h-12 text-sm bg-[#0C0C0C] hover:bg-zinc-800 text-white"
                                disabled={loading || cooldown > 0}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    cooldown > 0 ? `Aguarde ${cooldown}s` : "Enviar Link de Recuperação"
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
