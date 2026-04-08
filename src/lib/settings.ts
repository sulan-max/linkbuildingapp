const KEYS = {
  gemini: 'lb_gemini_key',
  ahrefs: 'lb_ahrefs_key',
  country: 'lb_country',
} as const

export function getGeminiKey(): string {
  return localStorage.getItem(KEYS.gemini) ?? (import.meta.env.VITE_GEMINI_API_KEY as string) ?? ''
}

export function getAhrefsKey(): string {
  return localStorage.getItem(KEYS.ahrefs) ?? ''
}

export function getCountry(): string {
  return localStorage.getItem(KEYS.country) ?? 'cz'
}

export function saveSettings(gemini: string, ahrefs: string, country: string): void {
  localStorage.setItem(KEYS.gemini, gemini)
  localStorage.setItem(KEYS.ahrefs, ahrefs)
  localStorage.setItem(KEYS.country, country)
}
