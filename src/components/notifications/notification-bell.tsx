"use client"

import { useState, useEffect } from "react"
import { Bell, Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

interface Notification {
    id: string
    title: string
    message: string
    read: boolean
    created_at: string
    link?: string
    user_id: string
    ticket_id?: string
}

export function NotificationBell() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const supabase = createClient()
    const router = useRouter()

    useEffect(() => {
        fetchNotifications()

        const channel = supabase
            .channel('notifications_bell')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications',
                    // Filter in callback or valid filter string if possible. 
                    // RLS should handle row visibility, but real-time sometimes needs User ID.
                    // Assuming RLS allows us to just listen or we subscribe generally and filter client-side if needed, 
                    // but best practice is filtering by user_id if we had it handy in a variable.
                    // For now we'll fetch strictly on event.
                },
                (payload) => {
                    // Ideally check payload.new.user_id === currentUserId
                    fetchNotifications()
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [])

    const fetchNotifications = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10)

        if (data) {
            setNotifications(data)
            setUnreadCount(data.filter(n => !n.read).length)
        }
    }

    const markAsRead = async (id: string, link?: string) => {
        await supabase
            .from('notifications')
            .update({ read: true })
            .eq('id', id)

        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        setUnreadCount(prev => Math.max(0, prev - 1))

        if (link) {
            router.push(link)
            setIsOpen(false)
        }
    }

    const markAllAsRead = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
        if (unreadIds.length === 0) return

        await supabase
            .from('notifications')
            .update({ read: true })
            .in('id', unreadIds)

        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
        setUnreadCount(0)
    }

    return (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-zinc-500 hover:text-black">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-600 border border-white" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 p-0 bg-white border border-zinc-200 shadow-lg z-50">
                <div className="flex items-center justify-between p-4 border-b border-zinc-100 bg-zinc-50/50">
                    <span className="font-bold text-sm">Notificações</span>
                    {unreadCount > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="h-auto p-0 text-xs text-zinc-500 hover:text-black"
                        >
                            Marcar lidas
                        </Button>
                    )}
                </div>

                <div className="max-h-[400px] overflow-y-auto py-2">
                    {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-400 text-sm">
                            Nenhuma notificação nova.
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem
                                key={notification.id}
                                className={cn(
                                    "flex flex-col items-start gap-1 p-4 cursor-pointer focus:bg-zinc-50 border-b border-zinc-50 last:border-0",
                                    !notification.read && "bg-blue-50/30"
                                )}
                                onClick={() => markAsRead(notification.id, notification.link || (notification.ticket_id ? `/portal/tickets/${notification.ticket_id}` : undefined))}
                            >
                                <div className="flex w-full justify-between items-start">
                                    <span className={cn("text-xs font-bold", !notification.read ? "text-[#0C0C0C]" : "text-zinc-500")}>
                                        {notification.title}
                                    </span>
                                    {!notification.read && (
                                        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                                    )}
                                </div>
                                <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                                    {notification.message}
                                </p>
                                <span className="text-[10px] text-zinc-400 font-medium mt-1">
                                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                                </span>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
