import { useState, useEffect } from 'react'
import type { ContactEntry, WebEntry } from '../types/linkbuilding'

const SHEET_ID = '1KLrwQ2Q6u-DxWP9Sn3ff1UivDTBf9xSyb-JJaMIjNL8'

function csvUrl(sheet: string) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheet)}`
}

function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const row: string[] = []
    let inQuote = false
    let current = ''
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        row.push(current); current = ''
      } else {
        current += ch
      }
    }
    row.push(current)
    rows.push(row)
  }
  return rows
}

function parseBool(val: string): boolean | null {
  if (!val) return null
  const v = val.trim().toUpperCase()
  if (v === 'TRUE' || v === '1' || v === 'ANO') return true
  if (v === 'FALSE' || v === '0' || v === 'NE') return false
  return null
}

export function useContactsData() {
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [websByContact, setWebsByContact] = useState<Map<string, WebEntry[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([
      fetch(csvUrl('Partneři')).then(r => { if (!r.ok) throw new Error('Nepodařilo se načíst list Partneři'); return r.text() }),
      fetch(csvUrl('Databáze LB')).then(r => { if (!r.ok) throw new Error('Nepodařilo se načíst list Databáze LB'); return r.text() }),
    ])
      .then(([partneriText, dbText]) => {
        // --- Partneři ---
        const contactsData: ContactEntry[] = parseCSV(partneriText)
          .slice(1)
          .filter(r => r[0]?.trim())
          .map(r => ({
            portfolio: r[0].trim(),
            kontakt: (r[1] ?? '').trim(),
            poznamka: (r[2] ?? '').trim(),
          }))

        // --- Databáze LB ---
        const webEntries: WebEntry[] = parseCSV(dbText)
          .slice(1)
          .filter(r => r[0]?.trim())
          .map(r => ({
            url: r[0].trim().replace(/\/$/, ''),
            dr: r[1]?.trim() ? Math.round(Number(r[1])) || null : null,
            portfolio: r[2] ?? '',
            kategorie: r[3] ?? '',
            ai: r[4] ?? '',
            cena: r[5] ?? '',
            dobaNasazeni: r[6] ?? '',
            vymenaKoup: r[7] ?? '',
            kontakt: r[8] ?? '',
            prClanek: parseBool(r[9] ?? ''),
            kdeBylPouzit: r[10] ?? '',
            kdeMuzeme: r[11] ?? '',
            kdeNepouzivat: r[12] ?? '',
          }))

        // Build map: kontakt → webs
        const map = new Map<string, WebEntry[]>()
        for (const web of webEntries) {
          if (!web.kontakt || web.kontakt === 'undefined') continue
          const list = map.get(web.kontakt) ?? []
          list.push(web)
          map.set(web.kontakt, list)
        }

        setContacts(contactsData)
        setWebsByContact(map)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Chyba při načítání Google Sheets')
        setLoading(false)
      })
  }, [])

  return { contacts, websByContact, loading, error }
}
