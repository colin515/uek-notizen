import type { AiProvider } from "./types";

export type AiModelOption = {
  id: string;
  label: string;
  description: string;
};

export type AiProviderDefinition = {
  id: AiProvider;
  label: string;
  shortLabel: string;
  description: string;
  keyLabel: string;
  keyPlaceholder: string;
  tutorialUrl: string;
  models: AiModelOption[];
  defaultModel: string;
};

export const AI_PROVIDERS: AiProviderDefinition[] = [
  {
    id: "groq",
    label: "GroqCloud",
    shortLabel: "Groq",
    description: "Sehr schnelle Inferenz mit Open-Weight-Modellen.",
    keyLabel: "Groq API-Key",
    keyPlaceholder: "gsk_…",
    tutorialUrl: "https://colin515.github.io/uek-notizen/ai-setup.html?provider=groq",
    defaultModel: "openai/gpt-oss-120b",
    models: [
      { id: "openai/gpt-oss-120b", label: "GPT-OSS 120B", description: "Stark für Erklären, Struktur und komplexere Aufgaben." },
      { id: "qwen/qwen3.8-27b", label: "Qwen 3.8 27B", description: "Schnell und vielseitig für Notizen und Lernfragen." },
      { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B", description: "Bewährtes Allround-Modell." }
    ]
  },
  {
    id: "openai",
    label: "OpenAI API",
    shortLabel: "OpenAI",
    description: "OpenAI-Modelle über einen API-Key der OpenAI Platform.",
    keyLabel: "OpenAI API-Key",
    keyPlaceholder: "sk-…",
    tutorialUrl: "https://colin515.github.io/uek-notizen/ai-setup.html?provider=openai",
    defaultModel: "gpt-5.6-terra",
    models: [
      { id: "gpt-5.6-terra", label: "GPT-5.6 Terra", description: "Gute Balance aus Intelligenz, Kosten und Geschwindigkeit." },
      { id: "gpt-5.4-mini", label: "GPT-5.4 Mini", description: "Schneller und günstiger für viele Lernaufgaben." },
      { id: "gpt-5.4", label: "GPT-5.4", description: "Stärker für anspruchsvollere Aufgaben." }
    ]
  },
  {
    id: "gemini",
    label: "Google Gemini API",
    shortLabel: "Gemini",
    description: "Gemini-Modelle über einen API-Key aus Google AI Studio.",
    keyLabel: "Gemini API-Key",
    keyPlaceholder: "AIza…",
    tutorialUrl: "https://colin515.github.io/uek-notizen/ai-setup.html?provider=gemini",
    defaultModel: "gemini-3.8-flash",
    models: [
      { id: "gemini-3.8-flash", label: "Gemini 3.8 Flash", description: "Aktuelles, starkes Flash-Modell für allgemeine Aufgaben." },
      { id: "gemini-3.5-flash", label: "Gemini 3.5 Flash", description: "Stabiles Flash-Modell für Lernen und Coding." },
      { id: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite", description: "Besonders schnell und kosteneffizient." }
    ]
  }
];

export function aiProviderDefinition(provider: AiProvider): AiProviderDefinition {
  return AI_PROVIDERS.find(item => item.id === provider) ?? AI_PROVIDERS[0];
}

export function defaultAiModel(provider: AiProvider): string {
  return aiProviderDefinition(provider).defaultModel;
}

export function aiTutorialUrl(provider: AiProvider): string {
  return aiProviderDefinition(provider).tutorialUrl;
}
