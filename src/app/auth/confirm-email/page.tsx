import { EmailConfirmation } from "@/components/auth/email-confirmation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function ConfirmEmailPage({ searchParams }: { searchParams?: Promise<{ error?: string }> }) {
    const params = await searchParams
    return (
        <div className="flex min-h-screen items-center justify-center bg-zinc-100 p-4">
            <Card className="w-full max-w-md bg-white p-0">
                <CardHeader className="border-b border-zinc-100 text-center"><CardTitle>GRAVTAH</CardTitle></CardHeader>
                <CardContent className="space-y-4 p-6 sm:p-8">
                    {params?.error === "invalid_link" && <p role="alert" className="text-sm text-red-700">Não foi possível validar esse link. Ele pode ter expirado ou já ter sido usado. Tente fazer login; se ainda precisar confirmar o e-mail, solicite um novo link abaixo e abra-o neste navegador.</p>}
                    <EmailConfirmation />
                </CardContent>
            </Card>
        </div>
    )
}
