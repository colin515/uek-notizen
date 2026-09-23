# ÜK Notizen

🌐 **Website & Download:** https://colin515.github.io/uek-notizen/

Eine ruhige, Notion-inspirierte Desktop-App für Schweizer ÜK-Lernende.

## Funktionen

- Lokale Notizen ohne Anmeldung oder Cloud-Pflicht
- ÜKs, Schnellnotizen ohne ÜK, Tags, Favoriten, Archiv und Volltextsuche
- **ICT-Modulbaukasten:** Ausbildung wählen und bekannte Module anhand ihrer Nummer erkennen
- Beim Anlegen eines bekannten Moduls werden Titel, Themenfelder und eine strukturierte Übersichtsnotiz vorbereitet
- **Prüfungen & Noten:** Leistungsbeurteilungen, Prüfungsstoff, Gewichtungen und Noten pro Modul erfassen
- Gewichtete Modulnote sowie aktueller Durchschnitt über alle benoteten ÜKs berechnen; 4.0 wird als Bestehensgrenze angezeigt
- Eigene/custom ÜKs bleiben möglich und können mit eigenen Prüfungen, Themen und Gewichtungen gepflegt werden
- Notiz-Templates für Tagesnotizen, Prüfungsvorbereitung, Cheatsheets, Arbeitsaufträge und Reflexion
- Erweitertes Slash-Menü mit Tabellen, Infoboxen, Code, Spalten, Bildern und Flowcharts
- Interaktiver Flowchart-Editor mit Drag & Drop und Verbindungen
- Formatierter Editor und DOCX-Export
- Optionaler Groq-KI-Assistent: Zusammenfassen, Erklären, Verbessern, Lernfragen sowie ÜKs und Notizen direkt erstellen
- Heller und dunkler Modus mit Onboarding-Tutorial
- Windows- und macOS-Builds über GitHub Actions
- Download-Seite über GitHub Pages

## ICT-Moduldaten

Die integrierte Modulerkennung orientiert sich am öffentlichen Modulbaukasten von ICT-Berufsbildung Schweiz. Die App speichert eine lokale Auswahl relevanter Modulnummern, Titel und Themenorientierungen und verlinkt auf die jeweiligen öffentlichen Modul-Seiten.

Die konkrete Aufteilung eines ÜK-Moduls in Tests, Projekte oder andere Leistungsbeurteilungen sowie deren Gewichtungen kann je ÜK-Anbieter bzw. Durchführung variieren. Deshalb sind diese Angaben in ÜK Notizen bewusst editierbar und werden nicht als schweizweit einheitliche Vorgaben ausgegeben.

## Lokal entwickeln

```bash
npm install
npm run tauri dev
```

## Veröffentlichung

Ein erfolgreicher Push auf `main` startet automatisch die Windows- und macOS-Builds und erstellt ein versioniertes GitHub Release. Die Download-Seite wird danach automatisch auf diese Version aktualisiert.

## Datenschutz

Notizen, Name, Ausbildung, Modul-/Notendaten und API-Key werden lokal im WebView-Speicher der App abgelegt. Nur wenn eine KI-Funktion bewusst ausgeführt wird, wird der relevante Notizkontext zusammen mit dem API-Key direkt an die Groq API übertragen.
