/**
 * Suppress non-critical console errors and warnings
 * This should be called early in the app lifecycle
 */

if (typeof window !== 'undefined') {
  // Suppress Vercel Analytics warnings
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes('Vercel Web Analytics') ||
      message.includes('Failed to load script from /_vercel/insights')
    ) {
      return // Suppress Vercel analytics warnings
    }
    originalWarn.apply(console, args)
  }

  // Suppress font preload warnings (these are just performance hints)
  const originalError = console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes('was preloaded using link preload but not used') ||
      message.includes('Please make sure it has an appropriate `as` value')
    ) {
      return // Suppress font preload warnings
    }
    originalError.apply(console, args)
  }

  // Suppress molstar structure-query modifier errors (non-critical)
  // These happen when certain query modifiers aren't available but don't break functionality
  const originalConsoleError = console.error
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || ''
    if (
      message.includes("Symbol 'structure-query.modifier.union' is not implemented") ||
      message.includes('structure-query.modifier')
    ) {
      return // Suppress non-critical molstar query modifier errors
    }
    originalConsoleError.apply(console, args)
  }
}

