"use client"

import { useSyncExternalStore } from "react"

const storageKey = "gravtah:auth-email-next-at"
const changedEvent = "gravtah:auth-email-cooldown"
let memoryDeadline = 0

export function getEmailCooldownSeconds(): number {
    if (typeof window === "undefined") return 0
    let deadline = memoryDeadline
    try {
        const saved = Number(window.localStorage.getItem(storageKey))
        if (Number.isFinite(saved)) deadline = Math.max(deadline, saved)
    } catch { /* Storage can be unavailable in private/locked browsers. */ }
    return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export function startEmailCooldown(seconds = 60) {
    if (typeof window === "undefined") return
    memoryDeadline = Math.max(memoryDeadline, Date.now() + seconds * 1000)
    try { window.localStorage.setItem(storageKey, String(memoryDeadline)) } catch { /* In-memory fallback. */ }
    window.dispatchEvent(new Event(changedEvent))
}

function subscribe(notify: () => void) {
    const timer = window.setInterval(notify, 1000)
    window.addEventListener("storage", notify)
    window.addEventListener(changedEvent, notify)
    return () => {
        window.clearInterval(timer)
        window.removeEventListener("storage", notify)
        window.removeEventListener(changedEvent, notify)
    }
}

export function useEmailCooldown() {
    return useSyncExternalStore(subscribe, getEmailCooldownSeconds, () => 0)
}
