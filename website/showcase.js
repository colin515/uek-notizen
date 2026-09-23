const moduleExamples = {
  "294": { title:"Frontend einer interaktiven Webapplikation realisieren", summary:"Web Engineering · Kompetenz, Handlungsziele und LBV werden automatisch geladen.", goals:"9" },
  "295": { title:"Backend für Applikationen realisieren", summary:"Web Engineering · API, Datenzugriff, Validierung, Security und Testing.", goals:"8" },
  "106": { title:"Datenbanken abfragen, bearbeiten und warten", summary:"Data Management · SQL, Abfragen, Daten bearbeiten und Datenbankpflege.", goals:"✓" },
  "187": { title:"ICT-Benutzerendgeräte und Arbeitsplatz in Betrieb nehmen", summary:"System Management · Geräte, Betriebssystem, Netzwerkzugang und Security.", goals:"✓" }
};

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.querySelectorAll("[data-glass]").forEach(surface => {
  surface.addEventListener("pointermove", event => {
    if (reducedMotion) return;
    const rect = surface.getBoundingClientRect();
    surface.style.setProperty("--gx", ((event.clientX - rect.left) / Math.max(1, rect.width) * 100).toFixed(2) + "%");
    surface.style.setProperty("--gy", ((event.clientY - rect.top) / Math.max(1, rect.height) * 100).toFixed(2) + "%");
  });
});

const tabs = document.querySelectorAll(".demo-tab");
const panes = document.querySelectorAll(".demo-pane");
tabs.forEach(button => button.addEventListener("click", () => {
  tabs.forEach(item => item.classList.toggle("active", item === button));
  panes.forEach(pane => pane.classList.toggle("active", pane.dataset.pane === button.dataset.mode));
}));

const moduleInput = document.getElementById("module-demo-input");
const moduleResult = document.getElementById("module-demo-result");
const moduleTitle = document.getElementById("demo-module-title");
const moduleSummary = document.getElementById("demo-module-summary");
let moduleTimer;

function renderModule() {
  if (!moduleInput || !moduleResult || !moduleTitle || !moduleSummary) return;
  const number = moduleInput.value.replace(/[^0-9]/g, "").slice(0, 4);
  moduleInput.value = number;
  moduleResult.classList.add("loading");
  clearTimeout(moduleTimer);
  moduleTimer = setTimeout(() => {
    const item = moduleExamples[number];
    const status = moduleResult.querySelector(":scope > small");
    const loaded = moduleResult.querySelector(".loaded-items");
    if (item) {
      if (status) status.textContent = "OFFIZIELLES MODUL ERKANNT";
      moduleTitle.textContent = item.title;
      moduleSummary.textContent = item.summary;
      if (loaded) loaded.innerHTML = `<span><b>${item.goals}</b> Handlungsziele</span><span><b>✓</b> Lernstoff</span><span><b>100%</b> LBV</span>`;
    } else if (number) {
      if (status) status.textContent = "MODULNUMMER BEREIT";
      moduleTitle.textContent = "Modul " + number;
      moduleSummary.textContent = "Die App lädt die öffentlichen Moduldaten beim Erstellen und speichert sie lokal.";
      if (loaded) loaded.innerHTML = "<span><b>↗</b> Modulbaukasten</span><span><b>✓</b> Laden</span><span><b>↓</b> Lokal</span>";
    } else {
      if (status) status.textContent = "BEREIT";
      moduleTitle.textContent = "Modulnummer eingeben";
      moduleSummary.textContent = "Zum Beispiel 294, 295, 106 oder 187.";
      if (loaded) loaded.innerHTML = "<span><b>1</b> Nummer</span><span><b>→</b> Laden</span><span><b>✓</b> Fertig</span>";
    }
    moduleResult.classList.remove("loading");
  }, 220);
}
moduleInput?.addEventListener("input", renderModule);

const aiResponses = {
  explain:"CRUD bedeutet <b>Create</b>, <b>Read</b>, <b>Update</b> und <b>Delete</b>. Denk an eine Notiz: erstellen, lesen, ändern, löschen.",
  summary:"<b>Kurzfassung:</b> REST organisiert Ressourcen über URLs. HTTP-Methoden beschreiben die Aktion und Statuscodes das Ergebnis.",
  quiz:"<b>Prüfungsfrage 1:</b> Welche HTTP-Methode nutzt du typischerweise für ein Update?<br><br><b>Prüfungsfrage 2:</b> Was unterscheidet Ressource und Endpoint?"
};
const aiButtons = document.querySelectorAll(".ai-demo-action");
const aiBox = document.getElementById("ai-demo-response");
const aiText = aiBox?.querySelector(".ai-response-text");
let aiTimer;
aiButtons.forEach(button => button.addEventListener("click", () => {
  aiButtons.forEach(item => item.classList.toggle("active", item === button));
  if (!aiBox || !aiText) return;
  aiBox.classList.add("typing");
  clearTimeout(aiTimer);
  aiTimer = setTimeout(() => {
    aiText.innerHTML = aiResponses[button.dataset.ai] || aiResponses.explain;
    aiBox.classList.remove("typing");
  }, 520);
}));

document.querySelectorAll(".demo-create").forEach(button => {
  button.addEventListener("click", () => {
    const before = button.textContent;
    button.textContent = "ÜK erstellt ✓";
    button.style.background = "#278461";
    setTimeout(() => {
      button.textContent = before;
      button.style.background = "";
    }, 1200);
  });
});

const revealObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = Number(entry.target.dataset.delay || 0);
        setTimeout(() => entry.target.classList.add("visible"), delay);
        revealObserver.unobserve(entry.target);
      });
    }, { threshold:.12, rootMargin:"0px 0px -30px 0px" })
  : null;

document.querySelectorAll(".reveal").forEach(node => {
  if (revealObserver) revealObserver.observe(node);
  else node.classList.add("visible");
});
