import type { ContactEntry, WebEntry } from '../types/linkbuilding'

function isEmail(value: string): boolean {
  return value.includes('@')
}

interface Props {
  contact: ContactEntry
  webs: WebEntry[]
  onClick: () => void
}

export function ContactCard({ contact, webs, onClick }: Props) {
  const initials = contact.portfolio
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  return (
    <div className="contact-card" onClick={onClick}>
      <div className="contact-card-avatar">{initials}</div>
      <div className="contact-card-body">
        <p className="contact-card-name">{contact.portfolio}</p>
        {contact.kontakt && (
          <p className="contact-card-sub">
            {isEmail(contact.kontakt) ? (
              <span className="contact-card-email">{contact.kontakt}</span>
            ) : (
              <span className="contact-card-platform">{contact.kontakt}</span>
            )}
          </p>
        )}
        {contact.poznamka && (
          <p className="contact-card-note">{contact.poznamka}</p>
        )}
      </div>
      {webs.length > 0 && (
        <span className="contact-card-web-count">{webs.length} webů</span>
      )}
    </div>
  )
}
