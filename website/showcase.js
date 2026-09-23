const moduleExamples = {
  "294": {
    title: "Frontend einer interaktiven Webapplikation realisieren",
    summary: "Web Engineering · Kompetenz, Handlungsziele und LBV werden automatisch geladen.",
    goals: "9"
  },
  "295": {
    title: "Backend für Applikationen realisieren",
    summary: "Web Engineering · API, Datenzugriff, Validierung, Security und Testing.",
    goals: "8"
  },
  "106": {
    title: "Datenbanken abfragen, bearbeiten und warten",
    summary: "Data Management · SQL, Abfragen, Daten bearbeiten und Datenbankpflege.",
    goals: "✓"
  },
  "187": {
    title: "ICT-Benutzerendgeräte und Arbeitsplatz in Betrieb nehmen",
    summary: "System Management · Geräte, Betriebssystem, Netzwerkzugang und Security.",
    goals: "✓"
  },
  "188": {
    title: "Services betreiben, warten und überwachen",
    summary: "Service Management · Betrieb, Monitoring, Wartung und Störungsbehebung.",
    goals: "✓"
  },
  "210": {
    title: "Public Cloud für Anwendungen nutzen",
    summary: "System Management · Cloud-Dienste, Deployment, Betrieb und Security.",
    goals: "✓"
  }
};

const tabButtons = document.querySelectorAll(".demo-tab");
const panes = document.querySelectorAll(".demo-pane");

tabButtons.forEach(button => {
  button.addEventListener("click", () => {
    tabButtons.forEach(item => item.classList.toggle("active", item === button));
    panes.forEach(pane => pane.classList.toggle("active", pane.dataset.pane === button.dataset.mode));
  });
});

const moduleInput = document.getElementById("module-demo-input");
const moduleResult = document.getElementById("module-demo-result");
const moduleTitle = document.getElementById("demo-module-title");
const moduleSummary = document.getElementById("demo-module-summary");
let moduleTimer;

function renderModuleDemo() {
  if (!moduleInput || !moduleResult || !moduleTitle || !moduleSummary) return;
  const number = moduleInput.value.replace(/[^0-9]/g, "").slice(0, 4);
  moduleInput.value = number;
  moduleResult.classList.add("loading");
  clearTimeout(moduleTimer);

  moduleTimer = setTimeout(() => {
    const found = moduleExamples[number];
    const top = moduleResult.querySelector(".module-result-top small");
    const items = moduleResult.querySelector(".loaded-items");

    if (found) {
      moduleTitle.textContent = found.title;
      moduleSummary.textContent = found.summary;
      if (top) top.textContent = "OFFIZIELLES MODUL ERKANNT";
      if (items) items.innerHTML = `<span><b>${found.goals}</b> Handlungsziele</span><span><b>✓</b> Lernstoff</span><span><b>100%</b> LBV</span>`;
    } else if (number) {
      moduleTitle.textContent = "Modul " + number;
      moduleSummary.textContent = "In der echten App werden die offiziellen Daten beim Erstellen direkt aus dem Modulbaukasten geladen.";
      if (top) top.textContent = "MODULNUMMER BEREIT";
      if (items) items.innerHTML = "<span><b>↗</b> Modulbaukasten</span><span><b>✓</b> Live laden</span><span><b>↓</b> Lokal speichern</span>";
    } else {
      moduleTitle.textContent = "Modulnummer eingeben";
      moduleSummary.textContent = "Zum Beispiel 294, 295, 106 oder 187.";
      if (top) top.textContent = "BEREIT";
      if (items) items.innerHTML = "<span><b>1</b> Nummer</span><span><b>→</b> Laden</span><span><b>✓</b> Fertig</span>";
    }
    moduleResult.classList.remove("loading");
  }, 260);
}

moduleInput?.addEventListener("input", renderModuleDemo);

const aiResponses = {
  explain: "CRUD sind die vier Grundaktionen auf Daten: <b>Create</b> erstellen, <b>Read</b> lesen, <b>Update</b> ändern und <b>Delete</b> löschen. Denk an einen Notizzettel: neu schreiben, anschauen, korrigieren, wegwerfen.",
  summary: "<b>Kurzfassung:</b> REST organisiert Ressourcen über URLs. CRUD beschreibt die vier Datenaktionen Erstellen, Lesen, Ändern und Löschen. HTTP-Methoden bilden diese Aktionen in einer API ab.",
  quiz: "<b>Prüfungsfrage 1:</b> Welche HTTP-Methode verwendest du typischerweise für ein Update?<br><br><b>Prüfungsfrage 2:</b> Was ist der Unterschied zwischen einer Ressource und einem Endpoint?"
};

const aiButtons = document.querySelectorAll(".ai-demo-action");
const aiBox = document.getElementById("ai-demo-response");
const aiText = aiBox?.querySelector(".ai-response-text");
let aiTimer;

aiButtons.forEach(button => {
  button.addEventListener("click", () => {
    aiButtons.forEach(item => item.classList.toggle("active", item === button));
    if (!aiBox || !aiText) return;
    aiBox.classList.add("typing");
    clearTimeout(aiTimer);
    aiTimer = setTimeout(() => {
      aiText.innerHTML = aiResponses[button.dataset.ai] || aiResponses.explain;
      aiBox.classList.remove("typing");
    }, 650);
  });
});

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay || 0);
        window.setTimeout(() => entry.target.classList.add("visible"), delay);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -30px 0px" })
  : null;

document.querySelectorAll(".reveal").forEach(element => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("visible");
});

const tiltCard = document.querySelector("[data-tilt]");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (tiltCard && !reducedMotion && window.matchMedia("(pointer:fine)").matches) {
  const stage = tiltCard.parentElement;
  stage?.addEventListener("pointermove", event => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltCard.style.transform = `rotateX(${-y * 3.2}deg) rotateY(${x * 4.2}deg) translateY(-2px)`;
  });
  stage?.addEventListener("pointerleave", () => {
    tiltCard.style.transform = "";
  });
}

document.querySelectorAll(".demo-create").forEach(button => {
  button.addEventListener("click", () => {
    const original = button.innerHTML;
    button.innerHTML = "ÜK erstellt <span>✓</span>";
    button.style.background = "#2f7059";
    window.setTimeout(() => {
      button.innerHTML = original;
      button.style.background = "";
    }, 1400);
  });
});
