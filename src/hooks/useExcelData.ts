import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import type { WebEntry } from '../types/linkbuilding'

export function useExcelData() {
  const [data, setData] = useState<WebEntry[]>([])
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
        const ws = wb.Sheets['Databáze LB']
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1 })

        const entries: WebEntry[] = (rows as unknown[][])
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

        setData(entries)
        setLoading(false)
      })
      .catch(err => {
        setError(String(err.message))
        setLoading(false)
      })
  }, [])

  return { data, loading, error }
}
