import { useState, useMemo } from 'react'
import { CLIENTS } from '../config/clients'
import { useLinkbuildingSheet } from '../hooks/useLinkbuildingSheet'
import { AnalyzaOdkazuDrawer } from '../components/AnalyzaOdkazuDrawer'

function getDrClass(dr: number | null): string {
  if (dr === null) return 'dr-gray'
  if (dr >= 60) return 'dr-green'
  if (dr >= 40) return 'dr-blue'
  if (dr >= 20) return 'dr-amber'
  return 'dr-red'
}

// Parsuje "MM/YYYY" → číslo pro řazení (YYYYMM)
function parseSortKey(mesicRok: string): number {
  const m = mesicRok.match(/^(\d{1,2})\/(\d{4})$/)
  if (!m) return 0
  return parseInt(m[2]) * 100 + parseInt(m[1])
}

// Vrátí sortKey pro relativní filtry
function currentSortKey(): number {
  const now = new Date()
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

function subtractMonths(n: number): number {
  const now = new Date()
  now.setMonth(now.getMonth() - n)
  return now.getFullYear() * 100 + (now.getMonth() + 1)
}

type Preset = '' | 'tento' | 'minuly' | '3m' | '6m'

const PRESET_LABELS: { id: Preset; label: string }[] = [
  { id: '', label: 'Vše' },
  { id: 'tento', label: 'Tento měsíc' },
  { id: 'minuly', label: 'Minulý měsíc' },
  { id: '3m', label: 'Poslední 3 měsíce' },
  { id: '6m', label: 'Poslední 6 měsíců' },
]

export function NasLinkbuildingPage() {
  const [clientIdx, setClientIdx] = useState(0)
  const [preset, setPreset] = useState<Preset>('')
  const [filterUrl, setFilterUrl] = useState('')
  const [drMin, setDrMin] = useState('')
  const [analyzaRow, setAnalyzaRow] = useState<{ url: string; dr: number | null } | null>(null)

  const client = CLIENTS[clientIdx] ?? null
  const { rows, loading, error } = useLinkbuildingSheet(client)

  // Unikátní měsíce chronologicky sestupně
  const mesice = useMemo(() => {
    const unique = [...new Set(rows.map(r => r.mesicRok).filter(Boolean))]
    return unique.sort((a, b) => parseSortKey(b) - parseSortKey(a))
  }, [rows])

  const filtered = useMemo(() => {
    const min = drMin !== '' ? Number(drMin) : null
    const now = currentSortKey()
    const prevMonth = subtractMonths(1)

    return rows
      .filter(r => {
        const key = parseSortKey(r.mesicRok)

        if (preset === 'tento' && key !== now) return false
        if (preset === 'minuly' && key !== prevMonth) return false
        if (preset === '3m' && key < subtractMonths(2)) return false
        if (preset === '6m' && key < subtractMonths(5)) return false

        if (filterUrl && !r.url.toLowerCase().includes(filterUrl.toLowerCase())) return false
        if (min !== null && (r.drDa === null || r.drDa < min)) return false
        return true
      })
      .sort((a, b) => parseSortKey(b.mesicRok) - parseSortKey(a.mesicRok))
  }, [rows, preset, filterUrl, drMin])

  const hasFilters = preset || filterUrl || drMin

  const resetFilters = () => { setPreset(''); setFilterUrl(''); setDrMin('') }
  const resetClient = (i: number) => { setClientIdx(i); resetFilters() }

  return (
    <div className="nas-lb-page">
      {/* Klient selector */}
      <div className="client-selector-card">
        <span className="client-selector-label">Klient</span>
        <div className="client-grid">
          {CLIENTS.map((c, i) => (
            <button
              key={i}
              className={`client-tile ${i === clientIdx ? 'active' : ''}`}
              onClick={() => resetClient(i)}
            >
              <span className="client-tile-dot" />
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Nadpis klienta */}
      {client && (
        <h2 className="nas-lb-heading">{client.name}</h2>
      )}

      {/* Filtry */}
      <div className="nas-lb-filters">
        <div className="nas-lb-presets">
          {PRESET_LABELS.map(p => (
            <button
              key={p.id}
              className={`nas-lb-preset-btn ${preset === p.id ? 'active' : ''}`}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          className="filter-select"
          placeholder="Hledat URL..."
          value={filterUrl}
          onChange={e => setFilterUrl(e.target.value)}
          style={{ minWidth: 180 }}
        />

        <input
          type="number"
          className="filter-input"
          placeholder="Min DR/DA"
          min={0} max={100}
          value={drMin}
          onChange={e => setDrMin(e.target.value)}
          style={{ width: 100 }}
        />

        {hasFilters && (
          <button className="btn btn-ghost" onClick={resetFilters}>
            Zrušit filtry
          </button>
        )}

        <span className="portfolio-count" style={{ marginLeft: 'auto' }}>
          {filtered.length}{filtered.length !== rows.length ? ` z ${rows.length}` : ''} odkazů
        </span>
      </div>

      {/* Stavy */}
      {loading && (
        <div className="page-state">
          <div className="spinner" />
          <p>Načítám data pro {client?.name}...</p>
        </div>
      )}

      {error && (
        <div className="page-state error">
          <span>⚠️</span>
          <p>{error}</p>
        </div>
      )}

      {/* Tabulka */}
      {!loading && !error && (
        <div className="nas-lb-table-wrap">
          <table className="nas-lb-table">
            <thead>
              <tr>
                <th>Měsíc / Rok</th>
                <th>URL odkazu</th>
                <th>DR / DA</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="nas-lb-empty">
                    {rows.length === 0 ? 'Žádná data v sheetu.' : 'Žádné výsledky — zkus změnit filtry.'}
                  </td>
                </tr>
              ) : (
                filtered.map((row, i) => (
                  <tr key={i}>
                    <td className="nas-lb-mesic">{row.mesicRok || '—'}</td>
                    <td className="nas-lb-url">
                      <a
                        href={row.url.startsWith('http') ? row.url : `https://${row.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {row.url}
                      </a>
                    </td>
                    <td>
                      {row.drDa !== null ? (
                        <span className={`nas-lb-dr ${getDrClass(row.drDa)}`}>
                          {row.drDa}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="nas-lb-analyze-btn"
                        onClick={() => setAnalyzaRow({ url: row.url, dr: row.drDa })}
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                        </svg>
                        Analyzovat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* AI analýza drawer */}
      {analyzaRow && (
        <AnalyzaOdkazuDrawer
          url={analyzaRow.url}
          dr={analyzaRow.dr}
          onClose={() => setAnalyzaRow(null)}
        />
      )}
    </div>
  )
}
