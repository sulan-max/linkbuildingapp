# Linkbuilding Asistent + Plánované Linkbuildingy — Design Spec

**Datum:** 2026-04-07  
**Stav:** Schváleno uživatelem

---

## Přehled

Dvě nové záložky v aplikaci LinkBuilder:

1. **Linkbuilding asistent** — uživatel zadá URL zákazníka, Gemini API analyzuje web a aplikace doporučí nejlepší weby z Databáze LB se skóre a důvodem doporučení.
2. **Plánované linkbuildingy** — seznam vybraných webů uložený v Supabase, se stavovými políčky (osloven, odkaz přidán) a možností smazání.

Obě záložky jsou dostupné až po přihlášení přes Google OAuth.

---

## Architektura

```
Browser (React + Vite)
  ├── Auth vrstva (Supabase Auth — Google OAuth)
  ├── Linkbuilding asistent
  │     ├── vstupní pole pro URL zákazníka
  │     ├── volá Supabase Edge Function `analyze-url`
  │     │     └── Edge Function zavolá Gemini API → vrátí { topic, keywords[] }
  │     └── frontend spočítá skóre pro každý web z Databáze LB (Excel, lokálně)
  └── Plánované linkbuildingy
        └── čte/zapisuje tabulku `planned_linkbuildings` v Supabase PostgreSQL

Supabase
  ├── Auth — Google OAuth provider
  ├── Edge Function: analyze-url
  │     ├── přijme { url: string }
  │     ├── zavolá Gemini API (klíč jako Supabase secret)
  │     └── vrátí { topic: string, keywords: string[] }
  └── PostgreSQL
        └── tabulka: planned_linkbuildings (viz schema níže)
```

---

## Databáze — Schema

### Tabulka `planned_linkbuildings`

| sloupec | typ | výchozí | popis |
|---|---|---|---|
| `id` | uuid | gen_random_uuid() | primární klíč |
| `user_id` | uuid | — | FK na auth.users |
| `customer_url` | text | — | URL zákazníka, pro kterého se LB plánuje |
| `web_url` | text | — | URL doporučeného webu z databáze |
| `dr` | integer | null | DR doporučeného webu |
| `score` | integer | — | celkové skóre 0–100 |
| `theme_reason` | text | — | věta vysvětlující důvod doporučení |
| `contacted` | boolean | false | byl web osloven? |
| `link_added` | boolean | false | byl odkaz přidán? |
| `created_at` | timestamptz | now() | datum přidání |

**Row Level Security:** každý uživatel čte a zapisuje pouze své záznamy (`user_id = auth.uid()`).

---

## Scoring algoritmus

Scoring probíhá lokálně v prohlížeči po obdržení výsledku z Gemini. Pro každý web z Databáze LB se spočítá skóre 0–100:

### 1. Tematická relevance — váha 40 %
Porovnání Gemini keywords se sloupci `ai` (AI Popis), `kategorie` a `kdeMuzeme` každého webu. Počet shodných slov / celkový počet keywords → 0–100.

### 2. DR webu — váha 25 %
Přímá normalizace: `score = min(dr, 80) / 80 * 100`. Weby s DR nad 80 dostávají plné skóre (příliš vysoký DR nemá smysl dál odměňovat).

### 3. Dostupnost — váha 20 %
- `kdeMuzeme` vyplněno → 100 bodů
- `kdeMuzeme` prázdné, `kdeNepouzivat` prázdné → 50 bodů
- `kdeNepouzivat` vyplněno → 0 bodů

### 4. Cena vs hodnota — váha 15 %
- Cena < 500 Kč → 100 bodů
- Cena 500–1500 Kč → 60 bodů
- Cena > 1500 Kč → 20 bodů
- Cena nevyplněna → 50 bodů (neutrální)

**Výsledné skóre:** `(rel*0.4 + dr*0.25 + avail*0.20 + price*0.15)` zaokrouhleno na celé číslo.

---

## Supabase Edge Function — `analyze-url`

**Vstup:**
```json
{ "url": "https://zakaznik.cz" }
```

**Logika:**
1. Gemini dostane prompt: popsat téma webu na dané URL, vrátit téma a 10 klíčových slov v češtině/angličtině.
2. Parsovat odpověď na `{ topic, keywords[] }`.

**Výstup:**
```json
{
  "topic": "E-shop s nábytkem a bytovým designem",
  "keywords": ["nábytek", "bytový design", "interiér", "obývací pokoj", ...]
}
```

**Chyby:** pokud Gemini selže nebo URL není dostupná → vrátit 500 s chybovou zprávou, frontend zobrazí chybový stav.

---

## UI — Přihlášení

- Pokud uživatel není přihlášen: místo obsahu aplikace se zobrazí centrovaná karta s logem LinkBuilder a tlačítkem **"Přihlásit se přes Google"**.
- Po přihlášení: standardní rozhraní aplikace.
- **Topbar** (vpravo nahoře): avatar + jméno uživatele z Google účtu + tlačítko "Odhlásit".

---

## UI — Záložka "Linkbuilding asistent"

1. **Input sekce:** textové pole "URL zákazníka" + tlačítko "Analyzovat"
2. **Loading stav:** spinner + text "Analyzuji web zákazníka..."
3. **Výsledky:** grid karet seřazených sestupně dle skóre

**Karta výsledku:**
- URL webu (klikací odkaz)
- DR badge (stejné barvy jako zbytek aplikace)
- Skóre v % — velké číslo, barva: zelená ≥70, oranžová 40–69, červená <40
- Věta s důvodem doporučení (z `theme_reason`)
- Tlačítko **"Vybrat"** → uloží záznam do Supabase, tlačítko se změní na "✓ Vybráno" (disabled)

---

## UI — Záložka "Plánované linkbuildingy"

- Záznamy seskupeny podle `customer_url` (každý zákazník = sekce s nadpisem)
- Každý řádek:
  - URL webu + DR badge + skóre %
  - Checkbox **"Osloven"** (aktualizuje `contacted` v Supabase při kliknutí)
  - Checkbox **"Odkaz přidán"** (aktualizuje `link_added` — řádek dostane zelený accent)
  - Tlačítko 🗑 smazat (s potvrzením)
- Prázdný stav: "Zatím žádné plánované linkbuildingy. Začni v záložce Asistent."

---

## Pořadí implementace

1. **Supabase projekt** — vytvoření projektu, Google OAuth, tabulka + RLS, Edge Function skeleton
2. **Auth v React** — Supabase klient, login screen, topbar s uživatelem
3. **Záložka "Plánované linkbuildingy"** — CRUD operace, checkboxy, seskupení
4. **Záložka "Linkbuilding asistent"** — Edge Function (Gemini), scoring, grid výsledků, tlačítko Vybrat

---

## Závislosti

- `@supabase/supabase-js` — Supabase klient pro React
- Supabase projekt (zdarma tier dostačuje)
- Gemini API klíč (uložený jako Supabase secret `GEMINI_API_KEY`)
- Google OAuth app (Google Cloud Console) + povolená redirect URL na Supabase
