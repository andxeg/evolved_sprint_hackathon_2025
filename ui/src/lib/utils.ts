import { type ClassValue,clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Cookie utility functions
export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null
  return null
}

export function setCookie(name: string, value: string, maxAge?: number): void {
  if (typeof document === 'undefined') return
  
  const cookieValue = `${name}=${value}; path=/`
  const maxAgeString = maxAge ? `; max-age=${maxAge}` : ''
  document.cookie = `${cookieValue}${maxAgeString}`
}
