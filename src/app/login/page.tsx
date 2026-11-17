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
import { getAuthErrorMessage } from "@/lib/auth/errors";
import { normalizedEmailSchema } from "@/lib/auth/registration";

export default function LoginPage() {
    const router = useRouter();
    const supabase = createClient();
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loginError, setLoginError] = useState("");

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        setLoginError("");

        try {
            const { data: authData, error: authError } =
                await supabase.auth.signInWithPassword({
                    email: normalizedEmailSchema.parse(email),
                    password,
                });

            if (authError) {
                throw authError;
            }

            const userId = authData.user.id;

            // Check User Role
            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("role")
                .eq("id", userId)
                .single();

            if (profileError) {
                // If profile fetch fails, fallback to portal or show error
                // But profiles should exist.
                throw new Error("Erro ao identificar perfil de usuário.");
            }

            toast.success("Login realizado com sucesso!");

            if (profile.role === "admin") {
                router.push("/admin/dashboard");
            } else {
                router.push("/portal/dashboard");
            }
        } catch (error) {
            setLoginError(getAuthErrorMessage(error, "Não foi possível entrar. Confira os dados e tente novamente."));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md bg-white border-zinc-200 shadow-sm p-0 overflow-hidden">
                <CardHeader className="bg-white border-b border-zinc-100 pb-6 pt-8 text-center">
                    <CardTitle className="text-3xl font-black tracking-tighter text-[#0C0C0C]">
                        GRAVTAH
                    </CardTitle>
                    <p className="text-sm font-medium text-zinc-500 uppercase tracking-wide mt-1">
                        Portal de Garantia
                    </p>
                </CardHeader>
                <CardContent className="p-8">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                autoComplete="email"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="seu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="bg-zinc-50/50"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="password">Senha</Label>
                                <Link
                                    href="/forgot-password"
                                    className="text-xs font-medium text-zinc-500 hover:text-[#0C0C0C] hover:underline"
                                >
                                    Esqueceu a senha?
                                </Link>
                            </div>
                            <Input
                                id="password"
                                type="password"
                                autoComplete="current-password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="bg-zinc-50/50"
                            />
                        </div>

                        {loginError && <p role="alert" className="text-sm text-red-700">{loginError}</p>}
                        <Button
                            type="submit"
                            className="w-full h-12 text-sm"
                            disabled={loading}
                        >
                            {loading ? "Entrando..." : "Entrar"}
                        </Button>
                    </form>

                    <Link href="/auth/confirm-email" className="mt-4 block text-center text-sm underline underline-offset-4">Não recebeu a confirmação? Reenviar e-mail</Link>

                    <div className="mt-8 text-center text-sm">
                        <span className="text-zinc-500">Não tem conta? </span>
                        <Link
                            href="/register"
                            className="font-bold text-[#0C0C0C] hover:underline uppercase text-xs"
                        >
                            Cadastre-se
                        </Link>
                    </div>
                </CardContent>
            </Card>

            {/* Footer / Copyright */}
            <div className="absolute bottom-6 text-center text-xs text-zinc-400 uppercase font-medium">
                &copy; {new Date().getFullYear()} Gravtah Performance
            </div>
        </div>
    );
}
