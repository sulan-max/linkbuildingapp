import { useState, type ReactElement } from 'react'
import { PortfolioPage } from './pages/Portfolio'
import { KontaktyPage } from './pages/Kontakty'
import { PlanovaneLinkyPage } from './pages/PlanovaneLinky'
import { AsistentPage } from './pages/Asistent'
import { NastaveniPage } from './pages/Nastaveni'
import { HledaniWebuPage } from './pages/HledaniWebu'
import { NasLinkbuildingPage } from './pages/NasLinkbuilding'
import { StatistikyPage } from './pages/Statistiky'
import { LoginScreen } from './components/LoginScreen'
import { useAuth } from './hooks/useAuth'
import './App.css'

type Page = 'dashboard' | 'portfolio' | 'asistent' | 'planovane' | 'kontakty' | 'statistiky' | 'nastaveni' | 'hledani' | 'nas-linkbuilding'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio webů',
  asistent: 'Linkbuilding asistent',
  planovane: 'Plánované linkbuildingy',
  kontakty: 'Kontakty',
  statistiky: 'Statistiky',
  nastaveni: 'Nastavení',
  hledani: 'Hledání nových webů',
  'nas-linkbuilding': 'Náš linkbuilding',
}

// SVG ikony (Heroicons stroke, 16×16 viewbox na 24×24)
const Icons: Record<string, ReactElement> = {
  dashboard: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  ),
  linkbuilding: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  ),
  portfolio: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M8.56 2.75c4.37 6.03 6.02 9.42 8.03 17.72m2.54-15.38c-3.72 4.35-8.94 5.66-16.88 5.85m19.5 1.9c-3.5-.93-6.63-.82-8.94 0-2.58.92-5.01 2.86-7.44 6.32"/>
    </svg>
  ),
  asistent: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  hledani: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  ),
  planovane: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
    </svg>
  ),
  kontakty: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  statistiky: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  nastaveni: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
}

const NAV_MAIN: { id: Page; label: string; iconKey: string }[] = [
  { id: 'dashboard',       label: 'Dashboard',        iconKey: 'dashboard' },
  { id: 'nas-linkbuilding',label: 'Náš linkbuilding',  iconKey: 'linkbuilding' },
  { id: 'portfolio',       label: 'Portfolio',         iconKey: 'portfolio' },
  { id: 'asistent',        label: 'Asistent',          iconKey: 'asistent' },
]

const NAV_TOOLS: { id: Page; label: string; iconKey: string }[] = [
  { id: 'hledani',    label: 'Hledání webů', iconKey: 'hledani' },
  { id: 'planovane',  label: 'Plánované',    iconKey: 'planovane' },
  { id: 'kontakty',   label: 'Kontakty',     iconKey: 'kontakty' },
  { id: 'statistiky', label: 'Statistiky',   iconKey: 'statistiky' },
  { id: 'nastaveni',  label: 'Nastavení',    iconKey: 'nastaveni' },
]

function DashboardContent() {
  return (
    <>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Aktivní projekty</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Domény v databázi</span>
          <span className="stat-value">472</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Odeslané žádosti</span>
          <span className="stat-value">0</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Získané linky</span>
          <span className="stat-value">0</span>
        </div>
      </div>
      <div className="empty-state">
        <span className="empty-icon">🔗</span>
        <h2>Vítejte v LinkBuilder</h2>
        <p>Začněte vytvořením prvního projektu a správou vašich linkbuilding kampaní.</p>
        <button className="btn btn-primary">Vytvořit první projekt</button>
      </div>
    </>
  )
}

function PlaceholderContent({ page }: { page: Page }) {
  return (
    <div className="empty-state">
      <span className="empty-icon">🚧</span>
      <h2>{PAGE_TITLES[page]}</h2>
      <p>Tato sekce bude brzy k dispozici.</p>
    </div>
  )
}

function App() {
  const [page, setPage] = useState<Page>('dashboard')
  const { user, loading, signInWithGoogle, signOut, authError } = useAuth()

  if (loading) {
    return (
      <div className="page-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={signInWithGoogle} errorMessage={authError} />
  }

  const avatarLetter = user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? '?'
  const displayName = user.user_metadata?.full_name ?? user.email ?? ''

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
            </svg>
          </div>
          <span className="logo-text">LinkBuilder</span>
        </div>

        <nav className="sidebar-nav">
          <span className="nav-section-label">Hlavní</span>
          {NAV_MAIN.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{Icons[item.iconKey]}</span>
              {item.label}
            </button>
          ))}

          <span className="nav-section-label" style={{ marginTop: 8 }}>Nástroje</span>
          {NAV_TOOLS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{Icons[item.iconKey]}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          {user.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt={displayName} className="sidebar-avatar-img" />
          ) : (
            <div className="sidebar-avatar-letter">{avatarLetter.toUpperCase()}</div>
          )}
          <div className="sidebar-footer-info">
            <span className="sidebar-footer-name">{displayName}</span>
          </div>
          <button className="sidebar-signout" onClick={signOut} title="Odhlásit">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <h1 className="page-title">{PAGE_TITLES[page]}</h1>
        </header>

        <main className="main-content">
          {page === 'dashboard' && <DashboardContent />}
          {page === 'portfolio' && <PortfolioPage />}
          {page === 'asistent' && <AsistentPage />}
          {page === 'planovane' && <PlanovaneLinkyPage />}
          {page === 'kontakty' && <KontaktyPage />}
          {page === 'nastaveni' && <NastaveniPage />}
          {page === 'hledani' && <HledaniWebuPage />}
          {page === 'nas-linkbuilding' && <NasLinkbuildingPage />}
          {page === 'statistiky' && <StatistikyPage />}
          {page !== 'dashboard' && page !== 'portfolio' && page !== 'asistent' && page !== 'planovane' && page !== 'kontakty' && page !== 'nastaveni' && page !== 'hledani' && page !== 'nas-linkbuilding' && page !== 'statistiky' && (
            <PlaceholderContent page={page} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
