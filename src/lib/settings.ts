const KEYS = {
  gemini: 'lb_gemini_key',
  ahrefs: 'lb_ahrefs_key',
  country: 'lb_country',
} as const

export function getGeminiKey(): string {
  const stored = localStorage.getItem(KEYS.gemini)
  if (stored) return stored  // non-empty stored value wins
  return (import.meta.env.VITE_GEMINI_API_KEY as string) ?? ''
}

export function getAhrefsKey(): string {
  return localStorage.getItem(KEYS.ahrefs) ?? ''
}

export function getCountry(): string {
  return localStorage.getItem(KEYS.country) ?? 'cz'
}

export function saveSettings(gemini: string, ahrefs: string, country: string): void {
  if (gemini) localStorage.setItem(KEYS.gemini, gemini)
  else localStorage.removeItem(KEYS.gemini)
  if (ahrefs) localStorage.setItem(KEYS.ahrefs, ahrefs)
  else localStorage.removeItem(KEYS.ahrefs)
  localStorage.setItem(KEYS.country, country)
}
