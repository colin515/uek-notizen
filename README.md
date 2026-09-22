# ÜK Notizen

🌐 **Website & Download:** https://colin515.github.io/uek-notizen/

Eine ruhige, Notion-inspirierte Desktop-App für Schweizer ÜK-Lernende.

## Funktionen

- Lokale Notizen ohne Anmeldung oder Cloud-Pflicht
- Kurse, Tags, Favoriten, Archiv und Volltextsuche
- Formatierter Editor und DOCX-Export
- Optionaler Groq-KI-Assistent: Zusammenfassen, Erklären, Verbessern, Lernfragen
- Heller und dunkler Modus
- Windows- und macOS-Builds über GitHub Actions
- Download-Seite über GitHub Pages

## Lokal entwickeln

```bash
npm install
npm run tauri dev
```

## Veröffentlichung

Ein Tag wie `v1.0.0` startet automatisch die Windows- und macOS-Builds und erstellt ein GitHub Release. Die Download-Seite liest die Release-Dateien automatisch ein.

## Datenschutz

Notizen, Name und API-Key werden lokal im WebView-Speicher der App abgelegt. Nur wenn eine KI-Funktion bewusst ausgeführt wird, wird der Text der aktuellen Notiz zusammen mit dem API-Key direkt an die Groq API übertragen.

