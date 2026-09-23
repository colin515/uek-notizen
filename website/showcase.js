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

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

document.addEventListener("pointermove", event => {
  if (reducedMotion) return;
  document.documentElement.style.setProperty("--mouse-x", (event.clientX / window.innerWidth * 100).toFixed(2) + "%");
  document.documentElement.style.setProperty("--mouse-y", (event.clientY / window.innerHeight * 100).toFixed(2) + "%");
});

document.querySelectorAll("[data-liquid]").forEach(card => {
  card.addEventListener("pointermove", event => {
    if (reducedMotion) return;
    const rect = card.getBoundingClientRect();
    card.style.setProperty("--local-x", ((event.clientX - rect.left) / Math.max(1, rect.width) * 100).toFixed(2) + "%");
    card.style.setProperty("--local-y", ((event.clientY - rect.top) / Math.max(1, rect.height) * 100).toFixed(2) + "%");
  });
});

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

  moduleTimer = window.setTimeout(() => {
    const found = moduleExamples[number];
    const status = moduleResult.querySelector(".module-status small");
    const items = moduleResult.querySelector(".loaded-items");

    if (found) {
      moduleTitle.textContent = found.title;
      moduleSummary.textContent = found.summary;
      if (status) status.textContent = "OFFIZIELLES MODUL ERKANNT";
      if (items) items.innerHTML = `<span><b>${found.goals}</b> Handlungsziele</span><span><b>✓</b> Lernstoff</span><span><b>100%</b> LBV</span>`;
    } else if (number) {
      moduleTitle.textContent = "Modul " + number;
      moduleSummary.textContent = "In der App werden die öffentlichen Moduldaten beim Erstellen direkt geladen und lokal gespeichert.";
      if (status) status.textContent = "MODULNUMMER BEREIT";
      if (items) items.innerHTML = "<span><b>↗</b> Modulbaukasten</span><span><b>✓</b> Live laden</span><span><b>↓</b> Lokal speichern</span>";
    } else {
      moduleTitle.textContent = "Modulnummer eingeben";
      moduleSummary.textContent = "Zum Beispiel 294, 295, 106 oder 187.";
      if (status) status.textContent = "BEREIT";
      if (items) items.innerHTML = "<span><b>1</b> Nummer</span><span><b>→</b> Laden</span><span><b>✓</b> Fertig</span>";
    }

    moduleResult.classList.remove("loading");
  }, 240);
}

moduleInput?.addEventListener("input", renderModuleDemo);

const aiResponses = {
  explain: "CRUD sind vier Grundaktionen: <b>Create</b>, <b>Read</b>, <b>Update</b> und <b>Delete</b>. Denk an eine Notiz: erstellen, lesen, ändern, löschen.",
  summary: "<b>Kurzfassung:</b> REST organisiert Ressourcen über URLs. HTTP-Methoden bilden Aktionen auf diesen Ressourcen ab und Statuscodes beschreiben das Ergebnis.",
  quiz: "<b>Prüfungsfrage 1:</b> Welche HTTP-Methode verwendest du typischerweise für ein Update?<br><br><b>Prüfungsfrage 2:</b> Was ist der Unterschied zwischen Ressource und Endpoint?"
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
    aiTimer = window.setTimeout(() => {
      aiText.innerHTML = aiResponses[button.dataset.ai] || aiResponses.explain;
      aiBox.classList.remove("typing");
    }, 560);
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
    }, { threshold: 0.11, rootMargin: "0px 0px -35px 0px" })
  : null;

document.querySelectorAll(".reveal").forEach(element => {
  if (revealObserver) revealObserver.observe(element);
  else element.classList.add("visible");
});

const tiltCard = document.querySelector("[data-tilt]");
if (tiltCard && !reducedMotion && window.matchMedia("(pointer:fine)").matches) {
  const stage = tiltCard.parentElement;

  stage?.addEventListener("pointermove", event => {
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltCard.style.transform = `rotateX(${-y * 2.5}deg) rotateY(${x * 3.4}deg) translateY(-3px)`;
  });

  stage?.addEventListener("pointerleave", () => {
    tiltCard.style.transform = "";
  });
}

document.querySelectorAll(".demo-create").forEach(button => {
  button.addEventListener("click", () => {
    const original = button.innerHTML;
    button.innerHTML = "ÜK erstellt <span>✓</span>";
    button.style.background = "linear-gradient(145deg,#39a67a,#3d8fcb)";
    window.setTimeout(() => {
      button.innerHTML = original;
      button.style.background = "";
    }, 1350);
  });
});
