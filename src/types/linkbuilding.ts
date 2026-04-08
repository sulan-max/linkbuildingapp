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

export interface CustomerProfile {
  mainNiche: string
  subNiches: string[]
  businessType: 'eshop' | 'sluzba' | 'blog' | 'b2b' | 'lokalni-sluzba'
  targetAudience: string
  czechKeywords: string[]
  idealSiteTypes: string[]
  linkContext: string
}

export type OpportunityType =
  | 'guest-post'
  | 'resource-page'
  | 'directory'
  | 'mention'
  | 'product-review'
  | 'news-coverage'
  | 'broken-link'

export type OutreachDifficulty = 'easy' | 'medium' | 'hard'

export interface Opportunity {
  domain: string
  domain_rating: number | null
  org_traffic: number | null
  refdomains: number | null
  relevanceScore: number
  opportunityType: OpportunityType
  outreachDifficulty: OutreachDifficulty
  reason: string
  outreachAngle: string
}
