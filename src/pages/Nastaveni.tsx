import { useState, useRef, useEffect } from 'react'
import { getGeminiKey, getAhrefsKey, getCountry, saveSettings } from '../lib/settings'

export function NastaveniPage() {
  const [gemini, setGemini] = useState(getGeminiKey)
  const [ahrefs, setAhrefs] = useState(getAhrefsKey)
  const [country, setCountry] = useState(getCountry)
  const [saved, setSaved] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSave = () => {
    saveSettings(gemini.trim(), ahrefs.trim(), country)
    setSaved(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current) }, [])

  return (
    <div className="nastaveni-page">
      <div className="nastaveni-card">
        <h2 className="nastaveni-title">API klíče</h2>

        <div className="nastaveni-field">
          <label className="nastaveni-label">
            Gemini API klíč
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="nastaveni-link"
            >
              Získat klíč →
            </a>
          </label>
          <input
            type="password"
            className="nastaveni-input"
            value={gemini}
            onChange={e => setGemini(e.target.value)}
            placeholder="AIza..."
            autoComplete="off"
          />
        </div>

        <div className="nastaveni-field">
          <label className="nastaveni-label">
            Ahrefs API klíč
            <a
              href="https://app.ahrefs.com/api"
              target="_blank"
              rel="noopener noreferrer"
              className="nastaveni-link"
            >
              Získat klíč →
            </a>
          </label>
          <input
            type="password"
            className="nastaveni-input"
            value={ahrefs}
            onChange={e => setAhrefs(e.target.value)}
            placeholder="Ahrefs API token"
            autoComplete="off"
          />
        </div>

        <div className="nastaveni-field">
          <label className="nastaveni-label">Výchozí země pro Ahrefs data</label>
          <select
            className="nastaveni-input"
            value={country}
            onChange={e => setCountry(e.target.value)}
          >
            <option value="cz">Česká republika (cz)</option>
            <option value="sk">Slovensko (sk)</option>
            <option value="pl">Polsko (pl)</option>
            <option value="de">Německo (de)</option>
            <option value="gb">Velká Británie (gb)</option>
            <option value="us">USA (us)</option>
          </select>
        </div>

        <button className="btn btn-primary" onClick={handleSave}>
          {saved ? '✓ Uloženo' : 'Uložit nastavení'}
        </button>

        <p className="nastaveni-note">
          Klíče jsou uloženy pouze v prohlížeči (localStorage). Nikdy neopouštějí vaše zařízení.
        </p>
      </div>
    </div>
  )
}
