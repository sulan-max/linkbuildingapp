import { useState } from 'react'
import { useContactsData } from '../hooks/useContactsData'
import { ContactCard } from '../components/ContactCard'
import { ContactDrawer } from '../components/ContactDrawer'
import type { ContactEntry } from '../types/linkbuilding'

export function KontaktyPage() {
  const { contacts, websByContact, loading, error } = useContactsData()
  const [selected, setSelected] = useState<ContactEntry | null>(null)

  if (loading) {
    return (
      <div className="page-state">
        <div className="spinner" />
        <p>Načítání kontaktů...</p>
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

  const selectedWebs = selected ? (websByContact.get(selected.kontakt) ?? []) : []

  return (
    <div className="contacts-page">
      <div className="portfolio-topbar">
        <span className="portfolio-count">{contacts.length} kontaktů</span>
      </div>

      <div className="contacts-grid">
        {contacts.map((contact, i) => (
          <ContactCard
            key={i}
            contact={contact}
            webs={websByContact.get(contact.kontakt) ?? []}
            onClick={() => setSelected(contact)}
          />
        ))}
      </div>

      <ContactDrawer
        contact={selected}
        webs={selectedWebs}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
