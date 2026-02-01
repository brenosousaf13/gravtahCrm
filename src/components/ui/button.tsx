import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: "default" | "outline" | "ghost" | "link" | "destructive"
    size?: "default" | "sm" | "lg" | "icon"
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant = "default", size = "default", ...props }, ref) => {
        return (
            <button
                ref={ref}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-bold uppercase tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
                    {
                        "bg-primary text-primary-foreground hover:bg-primary/90 shadow":
                            variant === "default",
                        "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90":
                            variant === "destructive",
                        "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground":
                            variant === "outline",
                        "hover:bg-accent hover:text-accent-foreground": variant === "ghost",
                        "text-primary underline-offset-4 hover:underline":
                            variant === "link",
                        "h-9 px-4 py-2": size === "default",
                        "h-8 px-3 text-xs": size === "sm",
                        "h-10 px-8": size === "lg",
                        "h-9 w-9": size === "icon",
                    },
                    className
                )}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button }
