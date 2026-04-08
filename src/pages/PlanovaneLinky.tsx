import { useState } from 'react'
import { usePlannedLinkbuildings } from '../hooks/usePlannedLinkbuildings'
import type { PlannedLinkbuilding } from '../hooks/usePlannedLinkbuildings'

function getDrColor(dr: number | null): string {
  if (dr === null) return '#9ca3af'
  if (dr >= 60) return '#16a34a'
  if (dr >= 40) return '#0693e3'
  if (dr >= 20) return '#d97706'
  return '#dc2626'
}

function getScoreColor(score: number): string {
  if (score >= 70) return '#16a34a'
  if (score >= 40) return '#d97706'
  return '#dc2626'
}

function groupByCustomer(items: PlannedLinkbuilding[]): Map<string, PlannedLinkbuilding[]> {
  const map = new Map<string, PlannedLinkbuilding[]>()
  for (const item of items) {
    const key = item.customer_url
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

interface RowProps {
  item: PlannedLinkbuilding
  onToggle: (id: string, field: 'contacted' | 'link_added', value: boolean) => void
  onDelete: (id: string) => void
}

function LinkRow({ item, onToggle, onDelete }: RowProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)

  return (
    <div className={`planned-row ${item.link_added ? 'planned-row--done' : ''}`}>
      <div className="planned-row-main">
        <a
          href={item.web_url.startsWith('http') ? item.web_url : `https://${item.web_url}`}
          target="_blank"
          rel="noopener noreferrer"
          className="planned-row-url"
        >
          {item.web_url}
        </a>
        <div className="planned-row-badges">
          {item.dr !== null && (
            <span className="badge-dr" style={{ background: getDrColor(item.dr) }}>
              DR {item.dr}
            </span>
          )}
          <span className="planned-score" style={{ color: getScoreColor(item.score) }}>
            {item.score}%
          </span>
        </div>
      </div>

      <p className="planned-row-reason">{item.theme_reason}</p>

      <div className="planned-row-actions">
        <label className="planned-checkbox">
          <input
            type="checkbox"
            checked={item.contacted}
            onChange={e => onToggle(item.id, 'contacted', e.target.checked)}
          />
          Osloven
        </label>
        <label className="planned-checkbox">
          <input
            type="checkbox"
            checked={item.link_added}
            onChange={e => onToggle(item.id, 'link_added', e.target.checked)}
          />
          Odkaz přidán
        </label>
        <div className="planned-delete-wrap">
          {confirmDelete ? (
            <>
              <span className="planned-confirm-text">Smazat?</span>
              <button className="btn-icon btn-icon--danger" onClick={() => onDelete(item.id)}>Ano</button>
              <button className="btn-icon" onClick={() => setConfirmDelete(false)}>Ne</button>
            </>
          ) : (
            <button className="btn-icon btn-icon--ghost" onClick={() => setConfirmDelete(true)}>
              🗑
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function PlanovaneLinkyPage() {
  const { items, loading, error, update, remove } = usePlannedLinkbuildings()

  if (loading) {
    return (
      <div className="page-state">
        <div className="spinner" />
        <p>Načítání plánovaných linkbuildingů...</p>
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

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">📋</span>
        <h2>Žádné plánované linkbuildingy</h2>
        <p>Začni v záložce Asistent — analyzuj web zákazníka a vyber weby pro linkbuilding.</p>
      </div>
    )
  }

  const grouped = groupByCustomer(items)

  return (
    <div className="planned-page">
      {Array.from(grouped.entries()).map(([customerUrl, rows]) => (
        <div key={customerUrl} className="planned-group">
          <div className="planned-group-header">
            <span className="planned-group-icon">🏢</span>
            <a
              href={customerUrl.startsWith('http') ? customerUrl : `https://${customerUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="planned-group-url"
            >
              {customerUrl}
            </a>
            <span className="planned-group-count">{rows.length} webů</span>
          </div>
          <div className="planned-rows">
            {rows.map(item => (
              <LinkRow
                key={item.id}
                item={item}
                onToggle={(id, field, value) => update(id, { [field]: value })}
                onDelete={remove}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
