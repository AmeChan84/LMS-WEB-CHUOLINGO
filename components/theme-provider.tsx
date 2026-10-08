"use client"

import * as React from "react"
import { useTheme as useNextTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ThemeProvider as NextThemesProvider } from "next-themes"

type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange {...props}>
      <TooltipProvider delayDuration={100}>
        {children}
        <Sonner
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
              description: "group-[.toast]:text-muted-foreground",
            },
          }}
        />
      </TooltipProvider>
    </NextThemesProvider>
  )
}

export { useNextTheme as useTheme }
