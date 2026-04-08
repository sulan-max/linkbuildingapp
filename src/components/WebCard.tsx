import { useState } from 'react'
import type { WebEntry } from '../types/linkbuilding'

function getScreenshotUrl(url: string): string {
  const normalized = url.startsWith('http') ? url : `https://${url}`
  return `https://shot.screenshotapi.net/screenshot?url=${encodeURIComponent(normalized)}&output=image&width=1280&height=900&fresh=false`
}

function getDrColor(dr: number | null): string {
  if (dr === null) return '#9ca3af'
  if (dr >= 60) return '#16a34a'
  if (dr >= 40) return '#0693e3'
  if (dr >= 20) return '#d97706'
  return '#dc2626'
}

interface Props {
  entry: WebEntry
  onClick: () => void
}

export function WebCard({ entry, onClick }: Props) {
  const [imgError, setImgError] = useState(false)
  const screenshotUrl = getScreenshotUrl(entry.url)
  const drColor = getDrColor(entry.dr)

  return (
    <div className="web-card" onClick={onClick}>
      <div className="card-screenshot">
        {!imgError ? (
          <img
            src={screenshotUrl}
            alt={entry.url}
            loading="lazy"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="screenshot-fallback">
            <span className="fallback-icon">🌐</span>
            <span className="fallback-url">{entry.url}</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <p className="card-url">{entry.url}</p>
        <div className="card-badges">
          {entry.dr !== null && (
            <span className="badge-dr" style={{ background: drColor }}>
              DR {entry.dr}
            </span>
          )}
          {entry.kategorie && (
            <span className="badge-category">{entry.kategorie.split(',')[0].trim()}</span>
          )}
          {entry.vymenaKoup && (
            <span className="badge-type">{entry.vymenaKoup}</span>
          )}
        </div>
      </div>
    </div>
  )
}
