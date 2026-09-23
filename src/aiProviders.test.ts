import { describe, expect, it } from "vitest";
import { AI_PROVIDERS, aiProviderDefinition, aiTutorialUrl, defaultAiModel } from "./aiProviders";

describe("AI provider catalog", () => {
  it("supports Groq, OpenAI and Gemini", () => {
    expect(AI_PROVIDERS.map(provider => provider.id)).toEqual(["groq", "openai", "gemini"]);
  });

  it("has supported models and defaults for every provider", () => {
    for (const provider of AI_PROVIDERS) {
      expect(provider.models.length).toBeGreaterThanOrEqual(3);
      expect(provider.models.some(model => model.id === defaultAiModel(provider.id))).toBe(true);
    }
  });

  it("links every provider to the hidden setup guide", () => {
    expect(aiTutorialUrl("groq")).toContain("ai-setup.html?provider=groq");
    expect(aiTutorialUrl("openai")).toContain("ai-setup.html?provider=openai");
    expect(aiTutorialUrl("gemini")).toContain("ai-setup.html?provider=gemini");
  });

  it("uses current default models", () => {
    expect(aiProviderDefinition("openai").defaultModel).toBe("gpt-5.6-terra");
    expect(aiProviderDefinition("gemini").defaultModel).toBe("gemini-3.8-flash");
    expect(aiProviderDefinition("groq").defaultModel).toBe("openai/gpt-oss-120b");
  });
});
