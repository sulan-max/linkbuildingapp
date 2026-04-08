import { useState } from 'react'
import { PortfolioPage } from './pages/Portfolio'
import { KontaktyPage } from './pages/Kontakty'
import { PlanovaneLinkyPage } from './pages/PlanovaneLinky'
import { AsistentPage } from './pages/Asistent'
import { LoginScreen } from './components/LoginScreen'
import { useAuth } from './hooks/useAuth'
import './App.css'

type Page = 'dashboard' | 'portfolio' | 'asistent' | 'planovane' | 'kontakty' | 'statistiky' | 'nastaveni'

const PAGE_TITLES: Record<Page, string> = {
  dashboard: 'Dashboard',
  portfolio: 'Portfolio webů',
  asistent: 'Linkbuilding asistent',
  planovane: 'Plánované linkbuildingy',
  kontakty: 'Kontakty',
  statistiky: 'Statistiky',
  nastaveni: 'Nastavení',
}

const NAV_ITEMS: { id: Page; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'portfolio', label: 'Portfolio', icon: '🔗' },
  { id: 'asistent', label: 'Asistent', icon: '🤖' },
  { id: 'planovane', label: 'Plánované', icon: '📋' },
  { id: 'kontakty', label: 'Kontakty', icon: '👤' },
  { id: 'statistiky', label: 'Statistiky', icon: '📊' },
  { id: 'nastaveni', label: 'Nastavení', icon: '⚙' },
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
  const { user, loading, signInWithGoogle, signOut } = useAuth()

  if (loading) {
    return (
      <div className="page-state" style={{ minHeight: '100vh' }}>
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onLogin={signInWithGoogle} />
  }

  const avatarLetter = user.user_metadata?.full_name?.[0] ?? user.email?.[0] ?? '?'
  const displayName = user.user_metadata?.full_name ?? user.email ?? ''

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">🔗</span>
          <span className="logo-text">LinkBuilder</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => setPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="main-wrapper">
        <header className="topbar">
          <h1 className="page-title">{PAGE_TITLES[page]}</h1>
          <div className="topbar-right">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="topbar-avatar"
              />
            ) : (
              <div className="topbar-avatar topbar-avatar-letter">
                {avatarLetter.toUpperCase()}
              </div>
            )}
            <span className="topbar-name">{displayName}</span>
            <button className="btn btn-outline" onClick={signOut}>
              Odhlásit
            </button>
          </div>
        </header>

        <main className="main-content">
          {page === 'dashboard' && <DashboardContent />}
          {page === 'portfolio' && <PortfolioPage />}
          {page === 'asistent' && <AsistentPage />}
          {page === 'planovane' && <PlanovaneLinkyPage />}
          {page === 'kontakty' && <KontaktyPage />}
          {page !== 'dashboard' && page !== 'portfolio' && page !== 'asistent' && page !== 'planovane' && page !== 'kontakty' && (
            <PlaceholderContent page={page} />
          )}
        </main>
      </div>
    </div>
  )
}

export default App
