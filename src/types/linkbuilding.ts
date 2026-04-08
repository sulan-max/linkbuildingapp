export interface ContactEntry {
  portfolio: string
  kontakt: string
  poznamka: string
}

export interface WebEntry {
  url: string
  dr: number | null
  portfolio: string
  kategorie: string
  ai: string
  cena: string
  dobaNasazeni: string
  vymenaKoup: string
  kontakt: string
  prClanek: boolean | null
  kdeBylPouzit: string
  kdeMuzeme: string
  kdeNepouzivat: string
}
