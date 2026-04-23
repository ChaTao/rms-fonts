# RMS Font Switcher

Setup zum Live-Austauschen von Schriften auf der RMS-Webseite für Kundenpräsentationen. Besteht aus zwei Teilen:

1. **Font-Server** auf GitHub Pages, der die Schriftdateien per HTTPS mit korrekten CORS-Headern ausliefert
2. **Tampermonkey-Userscript**, das im Browser ein Floating Panel einblendet und die Fonts live tauscht

---

## Teil 1: Font-Server auf GitHub Pages einrichten

### 1.1 Repository anlegen

1. Auf github.com einloggen und neues Repository anlegen: `rms-fonts` (oder beliebiger Name)
2. Repository öffentlich lassen (GitHub Pages für private Repos kostet extra)
3. Lokal klonen:

```bash
git clone https://github.com/DEIN-USERNAME/rms-fonts.git
cd rms-fonts
```

### 1.2 Inhalte übernehmen

Die Dateien aus dem Ordner `fonts-server/` in dein neues Repository kopieren:

```
rms-fonts/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── fonts/
│   └── (hier kommen die .woff2-Dateien rein)
└── index.html
```

### 1.3 Fonts hochladen

Die .woff2-Dateien (oder .woff als Fallback) in den Ordner `fonts/` legen. Sinnvolle Benennung:

- `schrift-a-regular.woff2`
- `schrift-a-bold.woff2`
- `schrift-b-regular.woff2`

Falls du nur .ttf oder .otf hast, vorher konvertieren. Dafür gibt es CLI-Tools (`fonttools`) oder online Dienste wie Transfonter. **Tipp:** Transfonter kann auch gleich eine .woff2-Datei und das passende @font-face-CSS als ZIP generieren.

### 1.4 Pushen

```bash
git add .
git commit -m "Initial fonts setup"
git push origin main
```

### 1.5 GitHub Pages aktivieren

1. Repository auf github.com öffnen
2. Settings → Pages
3. Unter "Build and deployment" → Source: **"GitHub Actions"** auswählen
4. Der Workflow läuft automatisch bei jedem Push auf `main`
5. Nach einer Minute ist die Seite unter `https://DEIN-USERNAME.github.io/rms-fonts/` erreichbar

### 1.6 CORS prüfen

GitHub Pages setzt standardmäßig `Access-Control-Allow-Origin: *` für alle Dateien. Das heißt: Fonts können von jeder Domain aus geladen werden, auch von rms.de. Kein extra Setup nötig.

Zum Testen im Browser-DevTools Console:

```javascript
fetch('https://DEIN-USERNAME.github.io/rms-fonts/fonts/schrift-a-regular.woff2')
  .then(r => console.log(r.status, r.headers.get('access-control-allow-origin')));
```

Sollte `200 *` ausgeben.

---

## Teil 2: Tampermonkey-Script installieren

### 2.1 Tampermonkey installieren

Falls noch nicht installiert: [Tampermonkey](https://www.tampermonkey.net/) für deinen Browser installieren (Chrome, Edge, Firefox, Safari).

### 2.2 Script anlegen

1. Tampermonkey-Icon in der Browser-Leiste klicken → "Neues Script"
2. Kompletten Inhalt von `userscript/rms-font-switcher.user.js` einfügen
3. Oben im Script die Zeile anpassen:

```javascript
const FONT_BASE_URL = 'https://DEIN-GITHUB-USERNAME.github.io/rms-fonts/fonts';
```

Mit deinem echten GitHub-Usernamen ersetzen.

### 2.3 Fonts konfigurieren

Im `FONTS`-Array die echten Schriften eintragen. Beispiel:

```javascript
const FONTS = [
  {
    id: 'original',
    label: 'Original (RMS)',
    family: null, // null = RMS-Original, keine Überschreibung
  },
  {
    id: 'inter',
    label: 'Inter',
    family: 'Inter',
    url: `${FONT_BASE_URL}/inter-variable.woff2`,
    scope: 'all',          // 'all' | 'headings' | 'body'
    weight: '400 700',     // Bereich für variable Fonts
  },
  {
    id: 'source-serif',
    label: 'Source Serif',
    family: 'Source Serif',
    url: `${FONT_BASE_URL}/source-serif-regular.woff2`,
    scope: 'all',
    weight: '400',
  },
  {
    id: 'headline-only',
    label: 'Playfair (Headlines)',
    family: 'Playfair Display',
    url: `${FONT_BASE_URL}/playfair-bold.woff2`,
    scope: 'headings',     // nur h1-h6
    weight: '700',
  },
];
```

**Scope-Werte:**
- `all` → komplette Seite (Default)
- `headings` → nur `h1` bis `h6`
- `body` → nur Fließtext (p, li, a, span, div, etc.)

### 2.4 Speichern und testen

1. Script speichern (Strg/Cmd + S)
2. rms.de im Browser öffnen (oder neu laden)
3. Rechts oben erscheint das Floating Panel
4. Button klicken → Font wird sofort getauscht

### 2.5 Panel-Features

- **Klick auf Font-Button** → Schrift aktivieren
- **Header greifen und ziehen** → Panel verschieben (Position wird gespeichert)
- **−-Button** → Panel einklappen (nur noch Header sichtbar)
- **Auswahl bleibt persistent** nach Reload (LocalStorage)

---

## Arbeitsablauf bei neuen Fonts

1. Neue .woff2-Datei in den `fonts/`-Ordner im Repository legen
2. `git add . && git commit -m "Neue Schrift XY" && git push`
3. Nach ca. 1 Minute ist der Font online
4. Im Tampermonkey-Script einen neuen Eintrag im `FONTS`-Array ergänzen
5. Seite neu laden, neuer Button erscheint im Panel

---

## Troubleshooting

**Font lädt nicht / Fallback-Schrift wird angezeigt:**
- DevTools → Network-Tab öffnen, nach der Font-URL suchen
- Status 404 → Dateiname stimmt nicht
- Status 200 aber CORS-Fehler → unwahrscheinlich bei GitHub Pages, aber falls doch: URL prüfen

**Panel erscheint nicht:**
- Tampermonkey-Icon → prüfen, ob Script für die Seite aktiv ist
- `@match`-Regeln im Script-Header prüfen (aktuell: `https://www.rms.de/*` und `https://rms.de/*`)

**Schrift wird an manchen Stellen nicht überschrieben:**
- Manche Themes setzen `font-family` mit sehr spezifischen Selektoren und `!important`
- Im Script ist bereits `!important` gesetzt, das sollte fast alles schlagen
- Falls doch: Browser-DevTools → Element inspizieren → sehen, welche CSS-Regel gewinnt
- Ggf. Scope-Selektor im Script erweitern

**Neuer Font im Dropdown, aber Panel zeigt alten Stand:**
- Seite einmal mit Strg+Shift+R neu laden (Cache-Bypass)

---

## Lizenz-Hinweis

Fonts sind urheberrechtlich geschützt. Diese Lösung ist ausschließlich für interne Demos
gedacht. Für produktiven Einsatz beim Kunden muss eine passende Lizenz vorliegen und die
Einbindung über den offiziellen Weg (eigener Server des Kunden oder Foundry-CDN) erfolgen.
