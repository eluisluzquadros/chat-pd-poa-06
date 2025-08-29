
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { type ThemeProviderProps } from "next-themes/dist/types"
import { useTheme as useNextTheme } from "next-themes"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export const useTheme = () => {
  const [mounted, setMounted] = React.useState(false)
  const { theme, setTheme, systemTheme } = useNextTheme()
  
  // This is important to prevent hydration mismatch
  React.useEffect(() => {
    setMounted(true)
  }, [])

  return { 
    theme, 
    setTheme, 
    systemTheme,
    mounted 
  }
}
