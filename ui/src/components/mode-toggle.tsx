'use client'

import { MoonIcon, SunIcon } from '@radix-ui/react-icons'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { Button } from '@/components/ui/button'

export function ModeToggle() {
  const { theme, setTheme } = useTheme()

  const isDarkMode = theme === 'dark'

  const toggleTheme = React.useCallback(() => {
    setTheme(isDarkMode ? 'light' : 'dark')
  }, [isDarkMode, setTheme])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label={`Activate ${isDarkMode ? 'light' : 'dark'} mode`}
      className="flex items-center justify-center"
    >
      <SunIcon className="h-[1rem] w-[1rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <MoonIcon className="absolute h-[1rem] w-[1rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  )
}
