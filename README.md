# ÜK Notizen

🌐 **Website & Download:** https://colin515.github.io/uek-notizen/

Eine ruhige, Notion-inspirierte Desktop-App für Schweizer ÜK-Lernende.

## Funktionen

- Lokale Notizen ohne Anmeldung oder Cloud-Pflicht
- ÜKs, Schnellnotizen ohne ÜK, Tags, Favoriten, Archiv und Volltextsuche
- **Vollständiger ICT-Modulbaukasten:** Ausbildung wählen + Modulnummer eingeben; die App lädt Kompetenz, Objekt, Handlungsziele und handlungsnotwendige Kenntnisse aus der öffentlichen Modulbaukasten-Datenquelle
- **Offizielle LBV automatisch:** veröffentlichte Prüfungselemente, Prüfungsstoff, Gewichtungen, Prüfungsform, Richtzeiten, Hilfsmittel und Bewertungskriterien werden übernommen und lokal im ÜK gespeichert
- Bei offiziellen Modulen bleibt die publizierte LBV unverändert; Noten werden direkt eingetragen. Optionale lokale Zusatznachweise eines Bildungsinstituts können bis maximal 20% der Modulnote ergänzt werden
- Bei mehreren veröffentlichten LBV-Varianten kann zwischen diesen offiziellen Varianten gewählt werden
- Gewichtete Modulnote sowie aktueller Durchschnitt über alle benoteten ÜKs berechnen; 4.0 wird als Bestehensgrenze angezeigt
- Bestehende offizielle ÜKs aus älteren Versionen werden automatisch mit den vollständigen Moduldaten angereichert
- Eigene/custom ÜKs bleiben möglich und können mit eigenen Prüfungen, Themen und Gewichtungen gepflegt werden
- Notiz-Templates für Tagesnotizen, Prüfungsvorbereitung, Cheatsheets, Arbeitsaufträge und Reflexion
- **Blockbasierter Slash-Editor:** leere Überschriften, Listen, Checklisten, Zitate, Infoboxen, Spalten, Bilder und Flowcharts ohne Platzhaltertext
- **Tabellen wie im Office-Editor:** Grösse über ein 10×10-Raster wählen, Zeilen/Spalten hinzufügen, löschen, verschieben, gleichmässig verteilen und Breite/Höhe direkt an Zellkanten verändern
- **Codeblöcke:** dunkle IDE-Darstellung, automatische Spracherkennung und Syntax-Highlighting für zahlreiche Sprachen
- Interaktiver Flowchart-Editor mit Drag & Drop und Verbindungen
- Formatierter Editor und DOCX-Export
- **Kontext-KI:** Text markieren und direkt fragen, erklären, verbessern oder in Tabelle/Flowchart umwandeln lassen
- Optionaler KI-Assistent mit GroqCloud, OpenAI API oder Google Gemini: mehrere ÜKs/Notizen in einem Prompt erstellen, Tabellen, Code und Flowcharts über ein strukturiertes Text-Befehlssystem erzeugen sowie Noten in bestehende Leistungsnachweise eintragen
- Heller und dunkler Modus mit Onboarding-Tutorial
- Windows- und macOS-Builds über GitHub Actions
- Download-Seite über GitHub Pages

## ICT-Moduldaten

Beim Hinzufügen eines offiziellen Moduls lädt ÜK Notizen die öffentlich verfügbaren Modul- und LBV-Daten. Nach dem Laden werden sie lokal im jeweiligen ÜK gespeichert. Dadurch enthält ein erkannter ÜK nicht nur Titel und Themen, sondern auch die publizierten Handlungsziele, Kenntnisse und Leistungsbeurteilungsvorgaben. Falls für ein Modul mehrere offizielle LBVs publiziert sind, speichert die App alle gefundenen Varianten.

## Lokal entwickeln

```bash
npm install
npm run tauri dev
```

## Veröffentlichung

Ein erfolgreicher Push auf `main` startet automatisch die Windows- und macOS-Builds und erstellt ein versioniertes GitHub Release. Die Download-Seite wird danach automatisch auf diese Version aktualisiert.

## Datenschutz

Notizen, Name, Ausbildung, Modul-/Notendaten und API-Key werden lokal im WebView-Speicher der App abgelegt. Beim Laden eines offiziellen Moduls wird nur die Modulnummer an die öffentliche Modulbaukasten-Datenquelle angefragt. Nur wenn eine KI-Funktion bewusst ausgeführt wird, wird der relevante Notizkontext zusammen mit dem gewählten API-Key direkt an den ausgewählten Anbieter (GroqCloud, OpenAI oder Google Gemini) übertragen.
