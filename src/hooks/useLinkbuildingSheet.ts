import { useState, useEffect } from 'react'
import type { ClientConfig } from '../config/clients'

export interface LinkRow {
  mesicRok: string
  url: string
  drDa: number | null
}

function csvUrl(client: ClientConfig): string {
  if (client.gid !== undefined) {
    return `https://docs.google.com/spreadsheets/d/${client.sheetId}/export?format=csv&gid=${client.gid}`
  }
  if (client.sheetName) {
    return `https://docs.google.com/spreadsheets/d/${client.sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(client.sheetName)}`
  }
  return `https://docs.google.com/spreadsheets/d/${client.sheetId}/export?format=csv&gid=0`
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

function normalize(s: string): string {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function detectColumns(headers: string[]): { mesicIdx: number; urlIdx: number; drIdx: number } {
  let mesicIdx = -1, urlIdx = -1, drIdx = -1
  headers.forEach((h, i) => {
    const n = normalize(h)
    if (mesicIdx === -1 && (n.includes('mesic') || n.includes('datum') || n.includes('month') || n.includes('rok') || n === 'date')) mesicIdx = i
    if (urlIdx === -1 && (n.includes('url') || n.includes('odkaz') || n.includes('link') || n.includes('web'))) urlIdx = i
    if (drIdx === -1 && (n === 'dr' || n === 'da' || n.includes('domain rating') || n.includes('domain authority'))) drIdx = i
  })
  return { mesicIdx, urlIdx, drIdx }
}

export function useLinkbuildingSheet(client: ClientConfig | null) {
  const [rows, setRows] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!client) return
    setLoading(true)
    setError(null)
    setRows([])

    const url = csvUrl(client)
    console.log('[sheet] fetching', url)
    fetch(url)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status} — zkontroluj sdílení sheetu`)
        return r.text()
      })
      .then(text => {
        if (text.trimStart().startsWith('<!')) {
          throw new Error('Google vrátil přihlašovací stránku — sheet není veřejný nebo název tabu je špatně')
        }
        console.log('[sheet] first 200 chars:', text.slice(0, 200))
        const all = parseCSV(text)
        if (all.length < 2) { setRows([]); setLoading(false); return }

        const { mesicIdx, urlIdx, drIdx } = detectColumns(all[0])

        const data: LinkRow[] = all.slice(1)
          .filter(r => r.some(c => c.trim()))
          .map(r => ({
            mesicRok: mesicIdx >= 0 ? (r[mesicIdx] ?? '').trim() : '',
            url: urlIdx >= 0 ? (r[urlIdx] ?? '').trim() : '',
            drDa: drIdx >= 0 && r[drIdx]?.trim() ? Number(r[drIdx].trim()) || null : null,
          }))
          .filter(r => r.url)

        setRows(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Chyba při načítání')
        setLoading(false)
      })
  }, [client?.sheetId, client?.sheetName])

  return { rows, loading, error }
}
