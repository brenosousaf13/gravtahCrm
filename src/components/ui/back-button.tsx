"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

export function BackButton() {
    const router = useRouter()

    return (
        <button 
            type="button" 
            onClick={() => router.back()} 
            className="text-zinc-400 hover:text-black transition-colors"
        >
            <ArrowLeft className="w-5 h-5" />
            <span className="sr-only">Voltar</span>
        </button>
    )
}
