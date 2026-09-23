export type ProfileId =
  | "informatik-ae"
  | "informatik-pe"
  | "betriebsinformatik"
  | "ict-fachleute-2018"
  | "ict-fachleute-2026"
  | "mediamatik"
  | "digital-business"
  | "gebaeudeautomation"
  | "gebaeude-kommunikation"
  | "gebaeude-planung";

export interface IctProfile {
  id: ProfileId;
  title: string;
  shortTitle: string;
  description: string;
}

export interface IctModule {
  number: string;
  title: string;
  field: string;
  profiles: ProfileId[];
  summary?: string;
  topics: string[];
  version?: string;
  sourceNote?: string;
}

export const ICT_PROFILES: IctProfile[] = [
  { id: "informatik-ae", title: "Informatiker/in EFZ – Applikationsentwicklung", shortTitle: "Applikationsentwicklung", description: "Software, Web, Daten, Schnittstellen und moderne Entwicklungsprozesse." },
  { id: "informatik-pe", title: "Informatiker/in EFZ – Plattformentwicklung", shortTitle: "Plattformentwicklung", description: "Systeme, Netzwerke, Cloud, Security und Plattformbetrieb." },
  { id: "betriebsinformatik", title: "Betriebsinformatiker/in EFZ", shortTitle: "Betriebsinformatik", description: "ICT-Betrieb, Support, Systeme und betriebliche Prozesse." },
  { id: "ict-fachleute-2026", title: "ICT-Fachfrau/-mann EFZ – BiVo 2026", shortTitle: "ICT-Fachleute 2026", description: "Aktuelle Grundbildung mit Endgeräten, Support, Netzwerken und Automatisierung." },
  { id: "ict-fachleute-2018", title: "ICT-Fachfrau/-mann EFZ – BiVo 2018", shortTitle: "ICT-Fachleute 2018", description: "Bisheriger Bildungsgang für ICT-Support und Arbeitsplatzbetrieb." },
  { id: "mediamatik", title: "Mediamatiker/in EFZ", shortTitle: "Mediamatik", description: "Web, Medienproduktion, Marketing und digitale Kommunikation." },
  { id: "digital-business", title: "Entwickler/in digitales Business EFZ", shortTitle: "Digital Business", description: "Geschäftsprozesse, Daten, Innovation, Kommunikation und digitale Lösungen." },
  { id: "gebaeudeautomation", title: "Gebäudeinformatiker/in EFZ – Gebäudeautomation", shortTitle: "Gebäudeautomation", description: "Gebäudeautomation, Steuerung, Sensorik und technische Systeme." },
  { id: "gebaeude-kommunikation", title: "Gebäudeinformatiker/in EFZ – Kommunikation & Multimedia", shortTitle: "Kommunikation & Multimedia", description: "Kommunikations-, Multimedia- und Gebäudesysteme." },
  { id: "gebaeude-planung", title: "Gebäudeinformatiker/in EFZ – Planung", shortTitle: "Gebäudeinformatik Planung", description: "Planung, Dokumentation und Koordination von Gebäudetechnik." }
];

const p = (...profiles: ProfileId[]) => profiles;
const commonDev = p("informatik-ae", "informatik-pe");
const broadIct = p("informatik-ae", "informatik-pe", "betriebsinformatik", "ict-fachleute-2018");

export const ICT_MODULES: IctModule[] = [
  {
    number: "187",
    title: "ICT-Benutzerendgeräte und Arbeitsplatz in Betrieb nehmen",
    field: "System Management",
    profiles: p("ict-fachleute-2018", "ict-fachleute-2026", "betriebsinformatik"),
    version: "2.0",
    summary: "ICT-Benutzerendgeräte und Arbeitsplätze nach Vorgaben produktiv einrichten, absichern, prüfen und über ihren Lebenszyklus betreuen.",
    topics: ["Betriebssystem & Applikationen", "Hardware & Peripherie", "Netzwerkzugang", "Security", "Troubleshooting", "Ergonomie & Nachhaltigkeit"]
  },
  {
    number: "294",
    title: "Frontend einer interaktiven Webapplikation realisieren",
    field: "Web Engineering",
    profiles: p("informatik-ae"),
    version: "1.0",
    summary: "Ein Frontend für eine interaktive Webapplikation mit bestehendem Backend implementieren und Daten per CRUD verwalten.",
    topics: ["Entwicklungsumgebung", "Frontend & SPA", "CRUD", "Backend-Kommunikation", "Routing", "Validierung & Security", "Testing", "Code-Richtlinien", "Versionsverwaltung", "Authentifizierung"]
  },
  {
    number: "295",
    title: "Backend für Applikationen realisieren",
    field: "Web Engineering",
    profiles: p("informatik-ae"),
    version: "1.0",
    summary: "Eine strukturierte Backend-Schnittstelle nach aktuellen Schnittstellen-Standards implementieren, dokumentieren, testen und absichern.",
    topics: ["Entwicklungsumgebung", "REST/API-Standards", "CRUD & Datenquelle", "Dokumentation", "Validierung & Security", "Testing", "Code-Richtlinien", "Versionsverwaltung", "Authentifizierung"]
  },
  {
    number: "162",
    title: "Daten analysieren und modellieren",
    field: "Data Management",
    profiles: p("informatik-ae", "informatik-pe", "digital-business"),
    version: "1.0",
    summary: "Datenbestände analysieren und daraus konzeptionelle sowie relationale Datenmodelle ableiten.",
    topics: ["Datenarten", "Datenqualität", "Datentypen", "Statistik", "Visualisierung", "Datenschutz", "ERM", "Kardinalitäten", "Relationales Modell"]
  },
  {
    number: "259",
    title: "ICT-Lösungen mit Machine Learning entwickeln",
    field: "Business Engineering",
    profiles: commonDev,
    version: "1.0",
    summary: "Machine-Learning-Anwendungen für betriebliche Aufgaben auswählen, mit Daten entwickeln, trainieren, testen und beurteilen.",
    topics: ["ML-Kategorien", "Klassifikation & Clustering", "Modelle & Verfahren", "Datenschutz", "Feature Engineering", "Datenaufbereitung", "Training & Test", "Evaluation"]
  },
  {
    number: "325",
    title: "Prozesse mit einer Programmiersprache automatisieren",
    field: "Business Engineering",
    profiles: p("digital-business", "informatik-ae", "informatik-pe"),
    version: "1.0",
    summary: "Prozessschritte mit einer Scriptsprache automatisieren und Umsysteme über Schnittstellen integrieren.",
    topics: ["Prozessanalyse", "Schnittstellen", "Automationslösung", "Scripting", "Tests", "Dokumentation"]
  },
  { number: "101", title: "Webauftritt erstellen und veröffentlichen", field: "Web Engineering", profiles: broadIct, topics: ["HTML", "Webauftritt", "Publikation"] },
  { number: "106", title: "Datenbanken abfragen, bearbeiten und warten", field: "Data Management", profiles: commonDev, topics: ["SQL", "Abfragen", "Daten bearbeiten", "Datenbankpflege"] },
  { number: "109", title: "Dienste in der Public Cloud betreiben und überwachen", field: "System Management", profiles: commonDev, topics: ["Public Cloud", "Cloud-Dienste", "Monitoring", "Betrieb"] },
  { number: "110", title: "Daten mit Tools analysieren und darstellen", field: "Data Management", profiles: commonDev, topics: ["Datenanalyse", "Tools", "Visualisierung"] },
  { number: "114", title: "Codierungs-, Kompressions- und Verschlüsselungsverfahren einsetzen", field: "Security / Data", profiles: broadIct, topics: ["Codierung", "Kompression", "Verschlüsselung"] },
  { number: "117", title: "Informatik- und Netzinfrastruktur für ein kleines Unternehmen realisieren", field: "Network Management", profiles: broadIct, topics: ["Netzwerk", "Infrastruktur", "Planung", "Inbetriebnahme"] },
  { number: "164", title: "Datenbanken erstellen und Daten einfügen", field: "Data Management", profiles: commonDev, topics: ["Datenbank", "Schema", "Tabellen", "Daten einfügen"] },
  { number: "165", title: "NoSQL-Datenbanken einsetzen", field: "Data Management", profiles: p("informatik-ae"), topics: ["NoSQL", "Datenmodell", "Abfragen"] },
  { number: "169", title: "Services mit Containern bereitstellen", field: "System Management", profiles: p("informatik-pe"), topics: ["Container", "Services", "Deployment"] },
  { number: "184", title: "Netzwerksicherheit implementieren", field: "Security / Risk Management", profiles: p("informatik-pe", "betriebsinformatik", "ict-fachleute-2018"), version: "4.0", topics: ["Netzwerksicherheit", "Schutzmassnahmen", "Netzwerkdienste"] },
  { number: "185", title: "Sicherheitsmassnahmen für KMU IT analysieren & implementieren", field: "Security / Risk Management", profiles: commonDev, topics: ["Risikoanalyse", "Security", "KMU", "Massnahmen"] },
  { number: "188", title: "Services betreiben, warten und überwachen", field: "Service Management", profiles: p("informatik-pe", "betriebsinformatik"), topics: ["Servicebetrieb", "Wartung", "Monitoring"] },
  { number: "190", title: "Virtualisierungsplattform aufbauen und betreiben", field: "System Management", profiles: p("informatik-pe", "betriebsinformatik"), topics: ["Virtualisierung", "Plattform", "Betrieb"] },
  { number: "208", title: "Störungen in Virtualisierungs- und Cloudsystemen bearbeiten", field: "System Management", profiles: p("ict-fachleute-2026"), topics: ["Virtualisierung", "Cloud", "Störungen", "Troubleshooting"] },
  { number: "216", title: "Internet of Everything-Endgeräte in bestehende Plattform integrieren", field: "System Management", profiles: p("ict-fachleute-2018", "ict-fachleute-2026"), topics: ["IoT", "Endgeräte", "Integration", "Plattform"] },
  { number: "241", title: "Innovative ICT-Lösungen initialisieren", field: "Business Engineering", profiles: commonDev, topics: ["Innovation", "Idee", "Anforderungen", "Konzept"] },
  { number: "245", title: "Innovative ICT-Lösungen umsetzen", field: "Business Engineering", profiles: commonDev, topics: ["Innovation", "Umsetzung", "ICT-Lösung"] },
  { number: "248", title: "ICT-Lösungen mit aktuellen Technologien realisieren", field: "Business Engineering", profiles: commonDev, topics: ["Technologieevaluation", "Prototyp", "Umsetzung", "Dokumentation"] },
  { number: "254", title: "Geschäftsprozesse im eigenen Betriebsumfeld beschreiben", field: "Business Engineering", profiles: p("informatik-ae", "informatik-pe", "digital-business"), topics: ["Geschäftsprozesse", "Prozessdarstellung", "Betriebsumfeld"] },
  { number: "261", title: "Funktion von ICT-Benutzer-Endgeräten in Netzinfrastruktur gewährleisten", field: "System Management", profiles: p("ict-fachleute-2018", "ict-fachleute-2026"), topics: ["Endgeräte", "Netzwerk", "Fehlersuche", "Betrieb"] },
  { number: "263", title: "Sicherheit von ICT-Benutzerendgeräten gewährleisten", field: "Security / Risk Management", profiles: p("ict-fachleute-2018", "ict-fachleute-2026"), topics: ["Endpoint Security", "Schutzmassnahmen", "Benutzerendgeräte"] },
  { number: "269", title: "Fotografieprojekt realisieren", field: "Multimedia", profiles: p("mediamatik"), topics: ["Fotografie", "Bildgestaltung", "Produktion"] },
  { number: "272", title: "Printprodukte entwerfen und umsetzen", field: "Design", profiles: p("mediamatik"), topics: ["Print", "Layout", "Gestaltung", "Produktion"] },
  { number: "276", title: "Medien für eine Marketingaktion erstellen", field: "Marketing Communication", profiles: p("mediamatik"), topics: ["Marketing", "Medienproduktion", "Kampagne"] },
  { number: "264", title: "Digitale Medienproduktionen vorbereiten", field: "Multimedia", profiles: p("mediamatik"), topics: ["Medienproduktion", "Planung", "Vorbereitung"] },
  { number: "265", title: "Digitale Fotografien produzieren", field: "Multimedia", profiles: p("mediamatik"), topics: ["Fotografie", "Produktion", "Bild"] },
  { number: "266", title: "Digitale Animationen produzieren", field: "Multimedia", profiles: p("mediamatik"), topics: ["Animation", "Produktion", "Motion"] },
  { number: "267", title: "Digitale Audioaufnahmen produzieren", field: "Multimedia", profiles: p("mediamatik"), topics: ["Audio", "Aufnahme", "Produktion"] },
  { number: "268", title: "Digitale Filme produzieren", field: "Multimedia", profiles: p("mediamatik"), topics: ["Video", "Film", "Produktion"] },
  { number: "270", title: "Farbe und Typografie bestimmen und einsetzen", field: "Design", profiles: p("mediamatik"), topics: ["Farbe", "Typografie", "Gestaltung"] },
  { number: "271", title: "Vektordaten erstellen und Bilder bearbeiten", field: "Design", profiles: p("mediamatik"), topics: ["Vektorgrafik", "Bildbearbeitung", "Design"] },
  { number: "273", title: "Layouts anlegen", field: "Design", profiles: p("mediamatik"), topics: ["Layout", "Gestaltung", "Raster"] },
  { number: "274", title: "Druckdaten aufbereiten und ausgeben", field: "Design", profiles: p("mediamatik"), topics: ["Druckdaten", "Prepress", "Ausgabe"] },
  { number: "275", title: "Gestaltungsentwürfe entwickeln und präsentieren", field: "Design", profiles: p("mediamatik"), topics: ["Entwurf", "Präsentation", "Gestaltung"] },
  { number: "279", title: "Marketingkonzept entwickeln und präsentieren", field: "Marketing Communication", profiles: p("mediamatik"), topics: ["Marketingkonzept", "Präsentation", "Strategie"] },
  { number: "280", title: "Analoge und digitale Marketingprodukte konzipieren", field: "Marketing Communication", profiles: p("mediamatik"), topics: ["Marketingprodukte", "Konzeption", "Kanäle"] },
  { number: "281", title: "Social-Media-Kanäle aufbauen und bewirtschaften", field: "Marketing Communication", profiles: p("mediamatik"), topics: ["Social Media", "Content", "Community"] },
  { number: "282", title: "Marketingkennzahlen auswerten und Inhalte für die betriebliche Kommunikation aufbereiten", field: "Marketing Communication", profiles: p("mediamatik"), topics: ["Kennzahlen", "Auswertung", "Kommunikation"] },
  { number: "286", title: "Eigene ICT-Arbeitsinstrumente einrichten und bedienen", field: "Hardware Management", profiles: p("mediamatik", "gebaeudeautomation", "gebaeude-kommunikation", "gebaeude-planung"), topics: ["ICT-Arbeitsmittel", "Einrichten", "Bedienung"] },
  { number: "287", title: "Websites mit CSS gestalten", field: "Web Engineering", profiles: p("mediamatik"), topics: ["CSS", "Webdesign", "Responsive Design"] },
  { number: "288", title: "Programmiertechniken im Webfrontend einsetzen", field: "Web Engineering", profiles: p("mediamatik"), topics: ["Webfrontend", "Programmierung", "Interaktion"] },
  { number: "289", title: "CMS einsetzen und bewirtschaften", field: "Web Engineering", profiles: p("mediamatik"), topics: ["CMS", "Content", "Web"] },
  { number: "290", title: "Datenbanken abfragen und verändern", field: "Data Management", profiles: p("mediamatik"), topics: ["Datenbank", "Abfragen", "Daten ändern"] },
  { number: "291", title: "Oberflächen (UIs) mit Webtechnologien entwickeln", field: "Web Engineering", profiles: p("mediamatik"), topics: ["UI", "Webtechnologien", "Frontend"] },

  { number: "238", title: "GKM-Systeme evaluieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation", "gebaeude-kommunikation", "gebaeude-planung"), topics: ["GKM-Systeme", "Evaluation", "Anforderungen"] },
  { number: "240", title: "Konzept für GA-Systeme erstellen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation", "gebaeude-planung"), topics: ["Gebäudeautomation", "Konzept", "Planung"] },
  { number: "299", title: "GMK-Komponenten analysieren und anschliessen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation", "gebaeude-kommunikation", "gebaeude-planung"), topics: ["GKM-Komponenten", "Analyse", "Anschluss"] },
  { number: "341", title: "Funktionsbeschrieb von GKM-Systemschnittstellen erstellen", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["Schnittstellen", "Funktionsbeschrieb", "GKM"] },
  { number: "342", title: "Datennetze und Schnittstellen von GMK-Systemen visualisieren", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["Datennetze", "Schnittstellen", "Visualisierung"] },
  { number: "343", title: "Planungsergebnisse zu GKM-Systemen präsentieren und begründen", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["Planung", "Präsentation", "Begründung"] },
  { number: "344", title: "Arbeiten an GA-Systemen technisch koordinieren", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["Gebäudeautomation", "Koordination", "Arbeiten"] },
  { number: "345", title: "Arbeiten an KMM-Systemen technisch koordinieren", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["KMM", "Koordination", "Arbeiten"] },
  { number: "350", title: "GA-Komponenten analysieren und prüfen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["GA-Komponenten", "Analyse", "Prüfung"] },
  { number: "351", title: "Technische Dokumentationen in der Gebäudeautomation interpretieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Dokumentation", "Gebäudeautomation", "Interpretation"] },
  { number: "352", title: "Integrale Funktionen konfigurieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Integrale Funktionen", "Konfiguration", "Gebäudeautomation"] },
  { number: "353", title: "GA-Systeme an Management- und Drittsysteme anbinden", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["GA-System", "Managementsystem", "Schnittstellen"] },
  { number: "354", title: "Regel- und Steuerfunktionen in Lüftungssystemen implementieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Lüftung", "Regelung", "Steuerung"] },
  { number: "355", title: "Regel- und Steuerfunktionen in Heizungssystemen implementieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Heizung", "Regelung", "Steuerung"] },
  { number: "356", title: "Licht- und Beschattungsfunktionen implementieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Licht", "Beschattung", "Automation"] },
  { number: "357", title: "Raumklimafunktionen implementieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Raumklima", "Automation", "Regelung"] },
  { number: "358", title: "Energieflüsse am Gebäude visualisieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Energie", "Visualisierung", "Gebäude"] },
  { number: "359", title: "Gebäudetechnische Sicherheitsfunktionen implementieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Gebäudesicherheit", "Automation", "Sicherheitsfunktionen"] },
  { number: "360", title: "GA-System in Betrieb nehmen und optimieren", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Inbetriebnahme", "Optimierung", "GA-System"] },
  { number: "361", title: "Einfache Voice- und Video-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation", "gebaeude-planung"), topics: ["Voice", "Video", "Inbetriebnahme"] },
  { number: "362", title: "Komplexe Voice- und Video-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["Voice", "Video", "Systeme"] },
  { number: "363", title: "Einfache Multimedia-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation", "gebaeude-planung"), topics: ["Multimedia", "Inbetriebnahme", "Systeme"] },
  { number: "364", title: "Komplexe Multimedia-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["Multimedia", "Komplexe Systeme", "Inbetriebnahme"] },
  { number: "365", title: "Erweiterte Dienste zur Verfügung stellen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["Dienste", "Bereitstellung", "KMM"] },
  { number: "366", title: "Erweiterte System-Dienste verknüpfen und zur Verfügung stellen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["System-Dienste", "Verknüpfung", "Bereitstellung"] },
  { number: "380", title: "GMK-Komponenten installieren und anschliessen", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["GKM-Komponenten", "Installation", "Anschluss"] },
  { number: "381", title: "GA-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["GA-System", "Inbetriebnahme", "Prüfung"] },
  { number: "382", title: "KMM-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["KMM", "Inbetriebnahme", "Systeme"] },
  { number: "383", title: "Schnittstellen von GMK-Systemen planen und einrichten", field: "Building Systems Engineering", profiles: p("gebaeude-planung"), topics: ["Schnittstellen", "Planung", "GKM"] },
  { number: "384", title: "GA-Komponenten anschliessen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["GA-Komponenten", "Anschluss", "Installation"] },
  { number: "385", title: "Einfache Haussteuerung umsetzen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["Haussteuerung", "Automation", "Umsetzung"] },
  { number: "386", title: "GA-Komponenten bis 230V erweitern und prüfen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["GA-Komponenten", "230V", "Prüfung"] },
  { number: "387", title: "Projekt mit dem KNX-Busstandard umsetzen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["KNX", "Projekt", "Busstandard"] },
  { number: "388", title: "Projekt mit SPS umsetzen", field: "Building Systems Engineering", profiles: p("gebaeudeautomation"), topics: ["SPS", "Projekt", "Steuerung"] },
  { number: "389", title: "Kommunikations- und Multimedia-Verkabelung konfektionieren, messen und protokollieren", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["Verkabelung", "Messung", "Protokoll"] },
  { number: "390", title: "Multimedia-Systeme in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["Multimedia", "Inbetriebnahme", "Systeme"] },
  { number: "391", title: "Virtualisiertes IP-Telefonsystem in Betrieb nehmen", field: "Building Systems Engineering", profiles: p("gebaeude-kommunikation"), topics: ["IP-Telefonie", "Virtualisierung", "Inbetriebnahme"] },

  { number: "304", title: "Einzelplatz-Computer in Betrieb nehmen", field: "Hardware Management", profiles: p("betriebsinformatik", "ict-fachleute-2018"), topics: ["Hardware", "Betriebssystem", "Inbetriebnahme"] },
  { number: "305", title: "Betriebssysteme installieren, konfigurieren und administrieren", field: "System Management", profiles: p("informatik-pe", "betriebsinformatik"), topics: ["Betriebssystem", "Installation", "Konfiguration", "Administration"] },
  { number: "313", title: "ICT-Mittel in Betrieb nehmen und kleines LAN aufbauen", field: "Network Management", profiles: p("ict-fachleute-2026"), topics: ["ICT-Mittel", "LAN", "Inbetriebnahme", "Netzwerk"] },
  { number: "319", title: "Applikationen entwerfen und implementieren", field: "Application Engineering", profiles: p("informatik-ae", "informatik-pe", "digital-business"), topics: ["Anforderungen", "Entwurf", "Implementierung", "Tests"] },
  { number: "320", title: "Applikationssicherheit implementieren", field: "Application Engineering", profiles: p("informatik-ae"), topics: ["Application Security", "Schutzmassnahmen", "Secure Coding"] },
  { number: "321", title: "Verteilte Systeme programmieren", field: "Application Engineering", profiles: p("informatik-ae"), topics: ["Verteilte Systeme", "Kommunikation", "Programmierung"] },
  { number: "322", title: "Benutzerschnittstellen entwerfen und implementieren", field: "Application Engineering", profiles: p("informatik-ae"), topics: ["UI", "UX", "Entwurf", "Implementierung"] },
  { number: "323", title: "Funktional Programmieren", field: "Application Engineering", profiles: p("informatik-ae"), topics: ["Funktionale Programmierung", "Funktionen", "Datenverarbeitung"] },
  { number: "324", title: "DevOps-Prozesse mit Tools unterstützen", field: "Application Engineering", profiles: p("informatik-ae"), topics: ["DevOps", "CI/CD", "Automatisierung", "Tools"] },
  { number: "327", title: "Automatisierungstechnologien einsetzen", field: "System Management", profiles: p("ict-fachleute-2026"), topics: ["Automatisierung", "Scripting", "Tools"] },
  { number: "335", title: "Mobile-Applikation realisieren", field: "Application Engineering", profiles: commonDev, topics: ["Mobile App", "UI", "Daten", "Testing"] },
  { number: "346", title: "Cloud Lösungen konzipieren und realisieren", field: "System Management", profiles: commonDev, topics: ["Cloud", "Architektur", "Umsetzung"] },
  { number: "347", title: "Dienst mit Container anwenden", field: "System Management", profiles: p("informatik-ae"), topics: ["Container", "Service", "Deployment"] },
  { number: "403", title: "Programmabläufe prozedural implementieren", field: "Application Engineering", profiles: broadIct, topics: ["Ablaufstrukturen", "Variablen", "Kontrollstrukturen", "Prozedurale Programmierung"] },
  { number: "404", title: "Objektorientiert programmieren nach Vorgabe", field: "Application Engineering", profiles: broadIct, topics: ["OOP", "Klassen", "Objekte", "Vorgaben"] },
  { number: "411", title: "Objektorientiert Programmieren", field: "Application Engineering", profiles: p("informatik-ae", "betriebsinformatik"), topics: ["OOP", "Klassen", "Objekte", "Design"] },
  { number: "426", title: "Software mit agilen Methoden entwickeln", field: "Application Engineering", profiles: p("informatik-ae", "betriebsinformatik"), topics: ["Agile Methoden", "Softwareentwicklung", "Teamarbeit"] },
  { number: "431", title: "Aufträge im eigenen Berufsumfeld selbständig durchführen", field: "Project Management", profiles: p("informatik-ae", "informatik-pe", "betriebsinformatik", "ict-fachleute-2018", "mediamatik", "gebaeudeautomation", "gebaeude-kommunikation", "gebaeude-planung"), topics: ["Auftrag", "Planung", "Umsetzung", "Dokumentation", "Reflexion"] },

  { number: "119", title: "Im Digital Business Umfeld auftreten und präsentieren", field: "Communication", profiles: p("digital-business"), topics: ["Auftreten", "Präsentation", "Kommunikation"] },
  { number: "134", title: "Projektentwicklung mit agilen Methoden ermöglichen", field: "Project Management", profiles: p("digital-business"), topics: ["Agilität", "Projektarbeit", "Methoden"] },
  { number: "168", title: "Geschäftsprozesse mit ICT-Mitteln unterstützen", field: "Business Engineering", profiles: p("digital-business"), topics: ["Geschäftsprozesse", "ICT-Unterstützung", "Optimierung"] },
  { number: "219", title: "Benutzerdokumentation und Schulungsunterlagen erstellen", field: "Communication", profiles: p("digital-business"), topics: ["Dokumentation", "Schulung", "Zielgruppe"] },
  { number: "220", title: "Anlässe unter Anleitung durchführen", field: "Communication", profiles: p("digital-business"), topics: ["Organisation", "Kommunikation", "Durchführung"] },
  { number: "224", title: "Mit digitalen Kollaborationstools arbeiten", field: "Collaboration", profiles: p("digital-business"), topics: ["Kollaboration", "Digitale Tools", "Teamarbeit"] },
  { number: "229", title: "Wirkungsvoll kommunizieren und moderieren", field: "Communication", profiles: p("digital-business"), topics: ["Kommunikation", "Moderation", "Zielgruppen"] },
  { number: "230", title: "Geschäftsprozesse nach Grundsätzen des Prozessmanagements modellieren", field: "Business Engineering", profiles: p("digital-business"), topics: ["Prozessmanagement", "Modellierung", "Geschäftsprozesse"] },
  { number: "235", title: "Daten zielgruppengerecht visualisieren", field: "Data Management", profiles: p("digital-business"), topics: ["Datenvisualisierung", "Zielgruppe", "Storytelling"] },
  { number: "278", title: "Den Markt analysieren und strategische Ziele ableiten", field: "Marketing Communication", profiles: p("digital-business"), topics: ["Marktanalyse", "Strategie", "Ziele"] },
  { number: "331", title: "Aufträge methodenunterstützt ausführen", field: "Project Management", profiles: p("digital-business"), topics: ["Auftragsabwicklung", "Methoden", "Selbstorganisation"] },
  { number: "333", title: "Projektumsetzung mit Methoden unterstützen", field: "Project Management", profiles: p("digital-business"), topics: ["Projektumsetzung", "Methoden", "Koordination"] },
  { number: "337", title: "Agiles Vorgehen im traditionellen Projektumfeld ermöglichen", field: "Project Management", profiles: p("digital-business"), topics: ["Agilität", "Hybride Projekte", "Zusammenarbeit"] },
  { number: "338", title: "Lösungen kreativ und innovativ entwickeln", field: "Business Engineering", profiles: p("digital-business"), topics: ["Innovation", "Kreativität", "Ideation", "Lösungsentwicklung"] },
  { number: "339", title: "Innovatives Projektmanagement ermöglichen", field: "Project Management", profiles: p("digital-business"), topics: ["Innovation", "Projektmanagement", "Methoden"] },
  { number: "348", title: "Geschäftsprozesse erfassen, modellieren und kritische Punkte ermitteln", field: "Business Engineering", profiles: p("digital-business"), topics: ["Geschäftsprozesse", "Modellierung", "Analyse", "Kritische Punkte"] },
  { number: "368", title: "Lösungsmöglichkeiten für Kundenerlebnisse erarbeiten", field: "Business Engineering", profiles: p("digital-business"), topics: ["Customer Experience", "Analyse", "Lösungsideen"] },
  { number: "370", title: "Mit verschiedenen Anspruchsgruppen in einer Fremdsprache kommunizieren", field: "Communication", profiles: p("digital-business"), topics: ["Fremdsprache", "Stakeholder", "Kommunikation"] },
  { number: "374", title: "Daten mit verschiedenen Methoden erheben", field: "Data Management", profiles: p("digital-business"), topics: ["Datenerhebung", "Methoden", "Datenqualität"] },
  { number: "375", title: "Daten statistisch auswerten", field: "Data Management", profiles: p("digital-business"), topics: ["Statistik", "Datenanalyse", "Interpretation"] },
  { number: "376", title: "Daten erheben und auswerten", field: "Data Management", profiles: p("digital-business"), topics: ["Datenerhebung", "Datenanalyse", "Auswertung"] },
  { number: "379", title: "Daten auswerten und interpretieren", field: "Data Management", profiles: p("digital-business"), topics: ["Datenanalyse", "Interpretation", "Erkenntnisse"] },
  { number: "394", title: "Digitale Transformation untersuchen", field: "Business Engineering", profiles: p("digital-business"), topics: ["Digitale Transformation", "Analyse", "Chancen & Risiken"] }
];

export function normalizeModuleNumber(value: string): string {
  const normalized = value.toUpperCase().replace(/ÜK|MODUL|MODULE|M/g, " ").trim();
  const match = normalized.match(/(\d{2,3}[A-Z]?)/);
  return match?.[1] ?? normalized.replace(/[^0-9A-Z]/g, "");
}

export function findIctModule(value: string, profileId?: string): IctModule | undefined {
  const number = normalizeModuleNumber(value);
  const matches = ICT_MODULES.filter(module => module.number.toUpperCase() === number);
  if (!matches.length) return undefined;
  if (profileId) {
    const profileMatch = matches.find(module => module.profiles.includes(profileId as ProfileId));
    if (profileMatch) return profileMatch;
  }
  return matches[0];
}

export function modulesForProfile(profileId?: string): IctModule[] {
  const ordered = [...ICT_MODULES].sort((a, b) => {
    const aMatch = profileId && a.profiles.includes(profileId as ProfileId) ? 1 : 0;
    const bMatch = profileId && b.profiles.includes(profileId as ProfileId) ? 1 : 0;
    return bMatch - aMatch || a.number.localeCompare(b.number, "de-CH", { numeric: true });
  });

  // Some official modules are shared by several professions. Keep only the
  // profile-relevant variant in browse/search lists, while findIctModule()
  // can still resolve the exact profile-specific metadata.
  const seen = new Set<string>();
  return ordered.filter(module => {
    if (seen.has(module.number)) return false;
    seen.add(module.number);
    return true;
  });
}

export function officialModuleUrl(module: IctModule): string {
  return "https://www.modulbaukasten.ch/module/" + encodeURIComponent(module.number);
}

export function moduleStarterHtml(module: IctModule): string {
  const topics = module.topics.map(topic => "<li>" + topic + "</li>").join("");
  return [
    "<div class=\"callout-block\"><strong>Modul " + module.number + " · " + module.title + "</strong><p>" + (module.summary || "Offizielles ICT-Modul. Nutze diese Notiz als Startpunkt und ergänze die Inhalte aus deinem ÜK.") + "</p></div>",
    "<h2>Orientierung</h2>",
    "<ul>" + topics + "</ul>",
    "<h2>Lernziele & wichtige Begriffe</h2><p></p>",
    "<h2>Praxis / Übungen</h2><p></p>",
    "<h2>Prüfungsvorbereitung</h2><ul><li>Was muss ich sicher erklären können?</li><li>Was muss ich praktisch umsetzen können?</li><li>Welche Fehler muss ich erkennen und beheben können?</li></ul>"
  ].join("");
}

export const NOTE_TEMPLATES = [
  {
    id: "day",
    title: "Tagesnotiz",
    description: "Für einen normalen ÜK-Tag.",
    html: "<h2>Heute behandelt</h2><ul><li></li></ul><h2>Wichtige Begriffe</h2><p></p><h2>Praxis</h2><p></p><h2>Offene Fragen</h2><ul><li></li></ul>"
  },
  {
    id: "exam",
    title: "Prüfungsvorbereitung",
    description: "Lernstoff, Unsicherheiten und Übungsfragen.",
    html: "<h2>Prüfungsstoff</h2><ul><li></li></ul><h2>Das kann ich sicher</h2><ul><li></li></ul><h2>Das muss ich noch üben</h2><ul><li></li></ul><h2>Übungsfragen</h2><ol><li></li></ol>"
  },
  {
    id: "cheatsheet",
    title: "Cheatsheet",
    description: "Kurze Befehle, Regeln und Beispiele.",
    html: "<h2>Merksätze</h2><ul><li></li></ul><h2>Befehle / Syntax</h2><pre class=\"code-block\">Beispiel</pre><h2>Typische Fehler</h2><ul><li></li></ul>"
  },
  {
    id: "project",
    title: "Arbeitsauftrag / Projekt",
    description: "Planen, umsetzen, testen und reflektieren.",
    html: "<h2>Auftrag</h2><p></p><h2>Anforderungen</h2><ul><li></li></ul><h2>Vorgehen</h2><ol><li></li></ol><h2>Tests</h2><ul><li></li></ul><h2>Reflexion</h2><p></p>"
  },
  {
    id: "reflection",
    title: "Reflexion",
    description: "Was lief gut, was nehme ich mit?",
    html: "<h2>Das habe ich gelernt</h2><p></p><h2>Das lief gut</h2><p></p><h2>Das war schwierig</h2><p></p><h2>Nächstes Mal</h2><p></p>"
  }
] as const;
