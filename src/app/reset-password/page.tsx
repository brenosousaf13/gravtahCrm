"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function ResetPasswordPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    // Supabase handles the token automatically via the URL before this renders (PKCE flow or implicit).
    // The user should have an active session created the moment they click the link containing the token.
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                // Se não houver sessão ao tentar redefinir, o link pode ter expirado ou estar inválido
                // Redireciona para o login com aviso
                toast.error("Link de redefinição inválido ou expirado. Solicite novamente.")
                router.push("/forgot-password")
            }
        }
        checkSession()
    }, [router, supabase])

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            return toast.error("As senhas não coincidem.");
        }

        if (password.length < 6) {
            return toast.error("A senha deve ter no mínimo 6 caracteres.");
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: password
            });

            if (error) {
                throw error;
            }

            toast.success("Senha atualizada com sucesso!");

            // Supabase updates the user and they are logged in. 
            // We can redirect them to the dashboard or let middleware handle it
            router.push("/login"); // or router.push('/portal/dashboard')

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || "Erro ao atualizar a senha.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md bg-white border-zinc-200 shadow-sm p-0 overflow-hidden">
                <CardHeader className="bg-white border-b border-zinc-100 pb-6 pt-8 text-center relative">
                    <CardTitle className="text-3xl font-black tracking-tighter text-[#0C0C0C]">
                        GRAVTAH
                    </CardTitle>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">
                        Criar Nova Senha
                    </p>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="password">Nova Senha</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-zinc-50/50"
                                disabled={loading}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={6}
                                className="bg-zinc-50/50"
                                disabled={loading}
                            />
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 text-sm bg-[#0C0C0C] hover:bg-zinc-800 text-white"
                            disabled={loading || !password || !confirmPassword}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Atualizando...
                                </>
                            ) : (
                                "Salvar e Entrar"
                            )}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
