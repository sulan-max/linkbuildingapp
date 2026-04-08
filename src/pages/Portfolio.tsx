import { useState } from 'react'
import { useExcelData } from '../hooks/useExcelData'
import { WebCard } from '../components/WebCard'
import { WebDrawer } from '../components/WebDrawer'
import type { WebEntry } from '../types/linkbuilding'

export function PortfolioPage() {
  const { data, loading, error } = useExcelData()
  const [selected, setSelected] = useState<WebEntry | null>(null)

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
      <div className="portfolio-topbar">
        <span className="portfolio-count">
          {data.length} webů v databázi
        </span>
      </div>

      <div className="portfolio-grid">
        {data.map((entry, i) => (
          <WebCard
            key={i}
            entry={entry}
            onClick={() => setSelected(entry)}
          />
        ))}
      </div>

      <WebDrawer
        entry={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
