import { useState, useMemo } from 'react'
import { useExcelData } from '../hooks/useExcelData'
import { WebCard } from '../components/WebCard'
import { WebDrawer } from '../components/WebDrawer'
import type { WebEntry } from '../types/linkbuilding'

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'cs'))
}

function parseCategories(raw: string): string[] {
  return raw.split(/[,;]/).map(s => s.trim()).filter(Boolean)
}

interface Filters {
  kategorie: string
  drMin: string
  drMax: string
  kdeMuzeme: string
  cena: string
}

const EMPTY: Filters = { kategorie: '', drMin: '', drMax: '', kdeMuzeme: '', cena: '' }

export function PortfolioPage() {
  const { data, loading, error } = useExcelData()
  const [selected, setSelected] = useState<WebEntry | null>(null)
  const [filters, setFilters] = useState<Filters>(EMPTY)

  const options = useMemo(() => {
    const kategorie = uniqueSorted(data.flatMap(e => parseCategories(e.kategorie)))
    const kdeMuzeme = uniqueSorted(data.flatMap(e => parseCategories(e.kdeMuzeme)))
    const cena = uniqueSorted(data.map(e => e.cena).filter(c => c && c !== '0'))
    return { kategorie, kdeMuzeme, cena }
  }, [data])

  const filtered = useMemo(() => {
    const drMin = filters.drMin !== '' ? Number(filters.drMin) : null
    const drMax = filters.drMax !== '' ? Number(filters.drMax) : null
    return data.filter(e => {
      if (filters.kategorie && !parseCategories(e.kategorie).includes(filters.kategorie)) return false
      if (drMin !== null && (e.dr === null || e.dr < drMin)) return false
      if (drMax !== null && (e.dr === null || e.dr > drMax)) return false
      if (filters.kdeMuzeme && !parseCategories(e.kdeMuzeme).includes(filters.kdeMuzeme)) return false
      if (filters.cena && e.cena !== filters.cena) return false
      return true
    })
  }, [data, filters])

  const hasFilters = Object.values(filters).some(Boolean)

  const set = (key: keyof Filters) => (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
    setFilters(f => ({ ...f, [key]: e.target.value }))

  if (loading) {
    return (
      <div className="page-state">
        <div className="spinner" />
        <p>Načítání databáze odkazů...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-state error">
        <span>⚠️</span>
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="portfolio-page">
      <div className="portfolio-filters">
        <select className="filter-select" value={filters.kategorie} onChange={set('kategorie')}>
          <option value="">Všechny kategorie</option>
          {options.kategorie.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <div className="filter-dr">
          <input
            type="number"
            className="filter-input"
            placeholder="DR od"
            min={0} max={100}
            value={filters.drMin}
            onChange={set('drMin')}
          />
          <span className="filter-dr-sep">–</span>
          <input
            type="number"
            className="filter-input"
            placeholder="DR do"
            min={0} max={100}
            value={filters.drMax}
            onChange={set('drMax')}
          />
        </div>

        <select className="filter-select" value={filters.kdeMuzeme} onChange={set('kdeMuzeme')}>
          <option value="">Kde můžeme použít</option>
          {options.kdeMuzeme.map(k => <option key={k} value={k}>{k}</option>)}
        </select>

        <select className="filter-select" value={filters.cena} onChange={set('cena')}>
          <option value="">Všechny ceny</option>
          {options.cena.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        {hasFilters && (
          <button className="btn btn-ghost filter-reset" onClick={() => setFilters(EMPTY)}>
            Zrušit filtry
          </button>
        )}
      </div>

      <div className="portfolio-topbar">
        <span className="portfolio-count">
          {filtered.length} {filtered.length !== data.length ? `z ${data.length}` : ''} webů
        </span>
      </div>

      <div className="portfolio-grid">
        {filtered.map((entry, i) => (
          <WebCard
            key={i}
            entry={entry}
            onClick={() => setSelected(entry)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">
          <span className="empty-icon">🔍</span>
          <h2>Žádné výsledky</h2>
          <p>Zkus změnit nebo zrušit filtry.</p>
        </div>
      )}

      <WebDrawer
        entry={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
