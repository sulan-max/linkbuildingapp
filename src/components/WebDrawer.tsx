import { useEffect } from 'react'
import type { WebEntry } from '../types/linkbuilding'

interface Props {
  entry: WebEntry | null
  onClose: () => void
}

function getDrColor(dr: number | null): string {
  if (dr === null) return '#9ca3af'
  if (dr >= 60) return '#16a34a'
  if (dr >= 40) return '#0693e3'
  if (dr >= 20) return '#d97706'
  return '#dc2626'
}

export function WebDrawer({ entry, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    if (entry) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [entry, onClose])

  return (
    <>
      <div
        className={`drawer-backdrop ${entry ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer ${entry ? 'open' : ''}`}>
        {entry && (
          <>
            <div className="drawer-header">
              <div className="drawer-header-info">
                <a
                  href={entry.url.startsWith('http') ? entry.url : `https://${entry.url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="drawer-url"
                  onClick={e => e.stopPropagation()}
                >
                  {entry.url} ↗
                </a>
                <div className="drawer-header-badges">
                  {entry.dr !== null && (
                    <span
                      className="drawer-dr"
                      style={{ background: getDrColor(entry.dr) }}
                    >
                      DR {entry.dr}
                    </span>
                  )}
                  {entry.portfolio && (
                    <span className="drawer-portfolio">{entry.portfolio}</span>
                  )}
                </div>
              </div>
              <button className="drawer-close" onClick={onClose} title="Zavřít (Esc)">
                ✕
              </button>
            </div>

            <div className="drawer-body">
              <div className="drawer-fields-grid">
                <Field label="Kategorie" value={entry.kategorie} />
                <Field label="Cena" value={entry.cena} suffix={entry.cena && !isNaN(Number(entry.cena)) ? ' Kč' : ''} />
                <Field label="Doba nasazení" value={entry.dobaNasazeni} />
                <Field label="Typ spolupráce" value={entry.vymenaKoup} />
                <Field label="PR Článek" value={
                  entry.prClanek === true ? '✅ Ano' :
                  entry.prClanek === false ? '❌ Ne' : ''
                } />
                <Field label="Kontakt" value={entry.kontakt} isEmail />
              </div>

              {entry.ai && (
                <section className="drawer-section">
                  <h4 className="drawer-section-title">AI Popis</h4>
                  <p className="drawer-ai-text">{entry.ai}</p>
                </section>
              )}

              {entry.kdeBylPouzit && (
                <section className="drawer-section">
                  <h4 className="drawer-section-title">Kde byl odkaz použit</h4>
                  <TagList value={entry.kdeBylPouzit} color="blue" />
                </section>
              )}

              {entry.kdeMuzeme && (
                <section className="drawer-section">
                  <h4 className="drawer-section-title">Kde můžeme použít</h4>
                  <TagList value={entry.kdeMuzeme} color="green" />
                </section>
              )}

              {entry.kdeNepouzivat && (
                <section className="drawer-section">
                  <h4 className="drawer-section-title">Kde nepoužívat</h4>
                  <TagList value={entry.kdeNepouzivat} color="red" />
                </section>
              )}
            </div>
          </>
        )}
      </div>
    </>
  )
}

function Field({
  label,
  value,
  isEmail,
  suffix = '',
}: {
  label: string
  value: string
  isEmail?: boolean
  suffix?: string
}) {
  if (!value || value === 'undefined' || value === 'null') return null
  return (
    <div className="drawer-field">
      <span className="drawer-field-label">{label}</span>
      {isEmail ? (
        <a href={`mailto:${value}`} className="drawer-field-value link">
          {value}
        </a>
      ) : (
        <span className="drawer-field-value">{value}{suffix}</span>
      )}
    </div>
  )
}

function TagList({ value, color }: { value: string; color: 'blue' | 'green' | 'red' }) {
  const tags = value.split(',').map(t => t.trim()).filter(Boolean)
  if (tags.length === 1 && tags[0] === value.trim()) {
    // long text, not comma-separated tags
    return <p className="drawer-text">{value}</p>
  }
  return (
    <div className="tag-list">
      {tags.map((tag, i) => (
        <span key={i} className={`tag tag-${color}`}>{tag}</span>
      ))}
    </div>
  )
}
