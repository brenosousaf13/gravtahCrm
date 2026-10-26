import { LockKeyhole } from "lucide-react"

export function CustomerCreationBlockedNotice() {
    return (
        <section role="status" className="flex items-start gap-3 rounded-md border border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-700">
            <LockKeyhole aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
                <h2 className="font-bold text-zinc-900">Abertura de novos tickets bloqueada</h2>
                <p className="mt-1">Seu cadastro está temporariamente impedido de abrir novos tickets. Aguarde a liberação da equipe. Você pode continuar acompanhando e respondendo aos atendimentos existentes.</p>
            </div>
        </section>
    )
}
