export function getAuthErrorMessage(error: unknown, fallback = "Não foi possível concluir. Tente novamente."): string {
    const detail = error && typeof error === "object" ? error as { code?: string; status?: number; message?: string } : {}
    const message = detail.message?.toLowerCase() || ""
    if (detail.code === "over_email_send_rate_limit" || message.includes("email rate limit exceeded")) {
        return "O limite de envio de e-mails foi atingido. Aguarde antes de tentar novamente. Se continuar, entre em contato com a equipe Gravtah."
    }
    if (detail.code === "over_request_rate_limit" || detail.status === 429 || message.includes("for security purposes")) {
        return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente."
    }
    switch (detail.code) {
        case "email_not_confirmed":
            return "Você precisa confirmar seu e-mail antes de entrar. Confira a caixa de entrada e o spam ou reenvie a confirmação."
        case "email_address_not_authorized":
        case "email_address_not_allowed":
            return "O envio de e-mails está indisponível para esse endereço. Entre em contato com a equipe Gravtah."
        case "user_already_exists":
        case "email_exists":
            return "Não foi possível cadastrar esse e-mail. Se você já tem uma conta, faça login ou recupere sua senha."
        case "invalid_credentials":
            return "E-mail ou senha incorretos. Confira os dados e tente novamente."
        case "email_address_invalid":
            return "Confira se o e-mail foi digitado corretamente."
        case "weak_password":
            return "Escolha uma senha mais forte e tente novamente."
        case "signup_disabled":
            return "Novos cadastros estão temporariamente indisponíveis. Entre em contato com a equipe Gravtah."
        default:
            return fallback
    }
}

export function isEmailNotConfirmed(error: unknown): boolean {
    return !!error && typeof error === "object" && "code" in error && error.code === "email_not_confirmed"
}

export function isAuthRateLimit(error: unknown): boolean {
    if (!error || typeof error !== "object") return false
    const detail = error as { code?: string; status?: number; message?: string }
    return detail.status === 429 || detail.code === "over_email_send_rate_limit" || detail.code === "over_request_rate_limit"
        || !!detail.message?.toLowerCase().includes("email rate limit exceeded")
}
