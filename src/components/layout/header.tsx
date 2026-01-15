import { NotificationBell } from "@/components/notifications/notification-bell"
import { UserNav } from "@/components/user-nav"

export function Header() {
    return (
        <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-end px-6 gap-4 shrink-0">
            <NotificationBell />
            <div className="h-8 w-px bg-zinc-200" />
            <UserNav />
        </header>
    )
}
