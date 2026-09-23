const providers = {
  groq: {
    label: "GroqCloud",
    note: "<b>Hinweis:</b> In GroqCloud können Projekt-Owner oder Nutzer mit Developer-Rolle API-Keys erstellen. Die App unterstützt GPT-OSS 120B, Qwen 3.8 27B und Llama 3.3 70B.",
    steps: [
      { title:"GroqCloud öffnen", short:"Anmelden", text:"Öffne die GroqCloud Console und melde dich an. Danach wechselst du zum Bereich API Keys.", tip:"Du brauchst keinen Key aus einem Chat-Fenster – der Key wird separat in der GroqCloud Console erstellt.", link:"https://console.groq.com/keys", visual:"login" },
      { title:"API-Key erstellen", short:"Create API Key", text:"Klicke auf „Create API Key“. Gib dem Key einen Namen wie „ÜK Notizen“ und erstelle ihn.", tip:"Nur Owner bzw. Nutzer mit Developer-Rolle können Keys erstellen oder verwalten.", link:"https://console.groq.com/keys", visual:"create" },
      { title:"Key einmal kopieren", short:"Kopieren", text:"Kopiere den neuen Key direkt nach dem Erstellen. Behandle ihn wie ein Passwort.", tip:"Wenn du ihn verlierst, erstellst du einfach einen neuen Key und ersetzt den alten in der App.", link:"https://console.groq.com/keys", visual:"copy" },
      { title:"In ÜK Notizen einsetzen", short:"Verbinden", text:"Zurück in der App: GroqCloud auswählen, Modell wählen, Key einfügen und auf „Verbindung testen“ klicken.", tip:"Wenn „Verbindung erfolgreich“ erscheint, ist alles fertig.", link:"https://console.groq.com/docs/quickstart", visual:"app" }
    ]
  },
  openai: {
    label: "OpenAI API",
    note: "<b>Wichtig:</b> ChatGPT und die OpenAI API haben getrennte Abrechnung. Ein ChatGPT Plus/Pro-Abo enthält nicht automatisch API-Guthaben. Für API-Nutzung muss die API-Plattform separat eingerichtet sein.",
    steps: [
      { title:"OpenAI Platform öffnen", short:"Anmelden", text:"Melde dich auf der OpenAI API Platform mit deinem OpenAI-Konto an.", tip:"Für ÜK Notizen brauchst du einen API-Key der OpenAI Platform, nicht dein ChatGPT-Passwort.", link:"https://platform.openai.com/api-keys", visual:"login" },
      { title:"API-Abrechnung prüfen", short:"Billing", text:"Stelle sicher, dass dein API-Konto für Nutzung freigeschaltet ist und bei Bedarf eine Zahlungsmethode bzw. API-Guthaben hinterlegt ist.", tip:"ChatGPT-Abos und API-Abrechnung sind getrennt.", link:"https://platform.openai.com/settings/organization/billing/overview", visual:"billing" },
      { title:"Secret Key erstellen", short:"API Key", text:"Öffne API Keys und erstelle einen neuen Secret Key für ÜK Notizen. Kopiere ihn direkt nach der Erstellung.", tip:"Ein Secret Key wird aus Sicherheitsgründen nicht dauerhaft vollständig angezeigt.", link:"https://platform.openai.com/api-keys", visual:"copy" },
      { title:"In ÜK Notizen einsetzen", short:"Verbinden", text:"OpenAI API auswählen, z. B. GPT-5.6 Terra oder GPT-5.4 Mini wählen, Key einfügen und die Verbindung testen.", tip:"Wenn ein Modell für dein API-Projekt nicht freigeschaltet ist, wähle eines der anderen unterstützten Modelle.", link:"https://developers.openai.com/api/docs/quickstart", visual:"app" }
    ]
  },
  gemini: {
    label: "Google Gemini",
    note: "<b>Stand September 2026:</b> Google stellt neue AI-Studio-Keys als Autorisierungsschlüssel aus. Alte uneingeschränkte Standard-Keys werden von der Gemini API nicht mehr akzeptiert. Verwende deshalb einen aktuellen Key aus Google AI Studio.",
    steps: [
      { title:"Google AI Studio öffnen", short:"Anmelden", text:"Öffne Google AI Studio und melde dich mit deinem Google-Konto an.", tip:"Der API-Key ist an ein Google-Cloud-Projekt gekoppelt.", link:"https://aistudio.google.com/app/apikey", visual:"login" },
      { title:"API-Key erstellen", short:"Create API key", text:"Öffne die API-Key-Verwaltung und erstelle einen neuen Key für ein Projekt. Neue Keys werden als sicherere Autorisierungsschlüssel erstellt.", tip:"Verwende keinen alten uneingeschränkten Standard-Key.", link:"https://aistudio.google.com/app/apikey", visual:"create" },
      { title:"Key kopieren", short:"Kopieren", text:"Kopiere den erstellten Gemini API-Key und bewahre ihn sicher auf.", tip:"Der Key darf niemals in öffentliche Repositories oder Screenshots gelangen.", link:"https://ai.google.dev/gemini-api/docs/api-key", visual:"copy" },
      { title:"In ÜK Notizen einsetzen", short:"Verbinden", text:"Google Gemini auswählen, Gemini 3.8 Flash, 3.5 Flash oder 3.5 Flash-Lite wählen, Key einfügen und testen.", tip:"Für neue Projekte ist Gemini 3.8 Flash eine gute Standardwahl.", link:"https://ai.google.dev/gemini-api/docs/models", visual:"app" }
    ]
  }
};

const params = new URLSearchParams(location.search);
let providerId = providers[params.get("provider")] ? params.get("provider") : "groq";
let stepIndex = 0;

const tabs = [...document.querySelectorAll("[data-provider]")];
const nav = document.getElementById("steps-nav");
const title = document.getElementById("step-title");
const kicker = document.getElementById("step-kicker");
const count = document.getElementById("step-count");
const text = document.getElementById("step-text");
const visual = document.getElementById("step-visual");
const tip = document.getElementById("step-tip");
const link = document.getElementById("official-link");
const note = document.getElementById("provider-note");
const prev = document.getElementById("prev-step");
const next = document.getElementById("next-step");

function visualMarkup(kind, provider) {
  const host = provider === "openai" ? "platform.openai.com" : provider === "gemini" ? "aistudio.google.com" : "console.groq.com";
  const providerLabel = providers[provider].label;
  const body = kind === "login"
    ? '<div class="mock-heading"></div><div class="mock-sub"></div><div class="mock-card"><strong>'+providerLabel+' Konto</strong><div class="mock-input">E-Mail / Konto</div><span class="mock-button highlight">Anmelden</span></div>'
    : kind === "billing"
    ? '<div class="mock-heading"></div><div class="mock-card"><strong>API Billing</strong><div class="mock-sub"></div><div class="mock-input">Payment method / Credits</div><span class="mock-button highlight">Add payment method</span></div>'
    : kind === "create"
    ? '<div class="mock-heading"></div><div class="mock-card"><strong>API Keys</strong><div class="mock-sub"></div><span class="mock-button highlight">＋ Create API Key</span></div>'
    : kind === "copy"
    ? '<div class="mock-heading"></div><div class="mock-card"><strong>New API Key</strong><div class="mock-input copy-key highlight">••••••••••••••••••••</div><span class="mock-button">Copy key</span></div>'
    : '<div class="mock-heading"></div><div class="mock-card"><strong>ÜK Notizen · KI verbinden</strong><div class="mock-input">'+providerLabel+'</div><div class="mock-input">Unterstütztes Modell</div><div class="mock-input copy-key">••••••••••••••••</div><span class="mock-button highlight">Verbindung testen</span></div>';

  return '<div class="mock-browser"><div class="mock-bar"><i></i><i></i><i></i><div class="mock-url">'+host+'</div></div><div class="mock-body">'+body+'</div><span class="cursor" style="right:18%;bottom:21%"></span></div>';
}

function render() {
  const provider = providers[providerId];
  const step = provider.steps[stepIndex];

  tabs.forEach(tab => tab.classList.toggle("active", tab.dataset.provider === providerId));
  nav.innerHTML = provider.steps.map((item,index) =>
    '<button class="step-nav-button '+(index===stepIndex?'active':'')+'" data-step="'+index+'"><span>'+(index+1)+'</span><div><b>'+item.short+'</b><small>'+item.title+'</small></div></button>'
  ).join("");
  nav.querySelectorAll("[data-step]").forEach(button => button.addEventListener("click", () => { stepIndex = Number(button.dataset.step); render(); }));

  kicker.textContent = "SCHRITT " + (stepIndex + 1);
  count.textContent = (stepIndex + 1) + " / " + provider.steps.length;
  title.textContent = step.title;
  text.textContent = step.text;
  tip.textContent = step.tip;
  link.href = step.link;
  visual.innerHTML = visualMarkup(step.visual, providerId);
  note.innerHTML = provider.note;
  prev.disabled = stepIndex === 0;
  next.textContent = stepIndex === provider.steps.length - 1 ? "Fertig" : "Weiter";
  history.replaceState(null, "", "?provider=" + providerId);
}

tabs.forEach(tab => tab.addEventListener("click", () => {
  providerId = tab.dataset.provider;
  stepIndex = 0;
  render();
}));

prev.addEventListener("click", () => {
  if (stepIndex > 0) stepIndex -= 1;
  render();
});

next.addEventListener("click", () => {
  const provider = providers[providerId];
  if (stepIndex < provider.steps.length - 1) {
    stepIndex += 1;
    render();
  } else {
    next.textContent = "Du kannst zur App zurück ✓";
    next.disabled = true;
  }
});

render();
