import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import type { ContactEntry, WebEntry } from '../types/linkbuilding'

export function useContactsData() {
  const [contacts, setContacts] = useState<ContactEntry[]>([])
  const [websByContact, setWebsByContact] = useState<Map<string, WebEntry[]>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/Odkazy CreatiCom.xlsx')
      .then(res => {
        if (!res.ok) throw new Error('Soubor Odkazy CreatiCom.xlsx nebyl nalezen v /public')
        return res.arrayBuffer()
      })
      .then(buffer => {
        const wb = XLSX.read(buffer, { type: 'array' })

        // --- Partneři ---
        const wsPartners = wb.Sheets['Partneři']
        const partnerRows = XLSX.utils.sheet_to_json<unknown[]>(wsPartners, { header: 1 }) as unknown[][]
        const contactsData: ContactEntry[] = partnerRows
          .slice(1)
          .filter(r => r[0])
          .map(r => ({
            portfolio: String(r[0] || '').trim(),
            kontakt: String(r[1] || '').trim(),
            poznamka: String(r[2] || '').trim(),
          }))

        // --- Databáze LB ---
        const wsDb = wb.Sheets['Databáze LB']
        const dbRows = XLSX.utils.sheet_to_json<unknown[]>(wsDb, { header: 1 }) as unknown[][]
        const webEntries: WebEntry[] = (dbRows as unknown[][])
          .slice(1)
          .filter(r => r[0])
          .map(r => ({
            url: String(r[0] || '').trim().replace(/\/$/, ''),
            dr: typeof r[1] === 'number' ? Math.round(r[1]) : null,
            portfolio: String(r[2] || ''),
            kategorie: String(r[3] || ''),
            ai: String(r[4] || ''),
            cena: r[5] != null ? String(r[5]) : '',
            dobaNasazeni: String(r[6] || ''),
            vymenaKoup: String(r[7] || ''),
            kontakt: String(r[8] || ''),
            prClanek: r[9] === true || r[9] === 1 ? true : r[9] === false || r[9] === 0 ? false : null,
            kdeBylPouzit: String(r[10] || ''),
            kdeMuzeme: String(r[11] || ''),
            kdeNepouzivat: String(r[12] || ''),
          }))

        // Build map: kontakt value → webs
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
        setError(String(err.message))
        setLoading(false)
      })
  }, [])

  return { contacts, websByContact, loading, error }
}
