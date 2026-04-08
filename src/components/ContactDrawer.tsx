import { useEffect } from 'react'
import type { ContactEntry, WebEntry } from '../types/linkbuilding'

interface Props {
  contact: ContactEntry | null
  webs: WebEntry[]
  onClose: () => void
}

function getDrColor(dr: number | null): string {
  if (dr === null) return '#9ca3af'
  if (dr >= 60) return '#16a34a'
  if (dr >= 40) return '#0693e3'
  if (dr >= 20) return '#d97706'
  return '#dc2626'
}

function isEmail(value: string): boolean {
  return value.includes('@')
}

export function ContactDrawer({ contact, webs, onClose }: Props) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    if (contact) document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [contact, onClose])

  const initials = contact
    ? contact.portfolio.split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
    : ''

  return (
    <>
      <div
        className={`drawer-backdrop ${contact ? 'visible' : ''}`}
        onClick={onClose}
      />
      <div className={`drawer ${contact ? 'open' : ''}`}>
        {contact && (
          <>
            <div className="drawer-header">
              <div className="drawer-header-info">
                <div className="contact-drawer-title">
                  <div className="contact-drawer-avatar">{initials}</div>
                  <span className="drawer-url" style={{ cursor: 'default' }}>{contact.portfolio}</span>
                </div>
                {contact.kontakt && (
                  <div className="drawer-header-badges">
                    {isEmail(contact.kontakt) ? (
                      <a
                        href={`mailto:${contact.kontakt}`}
                        className="drawer-portfolio"
                        style={{ textDecoration: 'none' }}
                        onClick={e => e.stopPropagation()}
                      >
                        ✉ {contact.kontakt}
                      </a>
                    ) : (
                      <span className="drawer-portfolio">{contact.kontakt}</span>
                    )}
                  </div>
                )}
              </div>
              <button className="drawer-close" onClick={onClose} title="Zavřít (Esc)">
                ✕
              </button>
            </div>

            <div className="drawer-body">
              {contact.poznamka && (
                <section className="drawer-section">
                  <h4 className="drawer-section-title">Poznámka</h4>
                  <p className="drawer-ai-text">{contact.poznamka}</p>
                </section>
              )}

              <section className="drawer-section">
                <h4 className="drawer-section-title">
                  Weby ({webs.length})
                </h4>
                {webs.length === 0 ? (
                  <p className="drawer-text" style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                    Žádné weby nenalezeny
                  </p>
                ) : (
                  <div className="contact-web-list">
                    {webs.map((web, i) => (
                      <div key={i} className="contact-web-row">
                        <a
                          href={web.url.startsWith('http') ? web.url : `https://${web.url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="contact-web-url"
                          onClick={e => e.stopPropagation()}
                        >
                          {web.url} ↗
                        </a>
                        {web.dr !== null && (
                          <span
                            className="badge-dr"
                            style={{ background: getDrColor(web.dr), flexShrink: 0 }}
                          >
                            DR {web.dr}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </>
  )
}
