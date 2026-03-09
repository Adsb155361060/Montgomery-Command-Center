/**
 * Gemini AI Client — uses multiple Gemini models based on task complexity.
 *
 * Model selection strategy (leveraging all available free-tier models):
 * - gemini-2.5-flash: Primary workhorse (1K RPM, 1M TPM) — dashboards, analysis, alerts
 * - gemini-3-flash: High-throughput tasks (1K RPM, 1M TPM) — batch scoring, classification
 * - gemini-2.0-flash: Fallback general (2K RPM, 4M TPM) — high volume, simple tasks
 * - gemini-2.5-pro: Deep analysis (150 RPM, 2M TPM) — executive briefings, complex strategy
 * - gemini-3-pro: Advanced reasoning (25 RPM, 1M TPM) — cross-module intelligence
 * - gemini-2.0-flash-lite: Lightweight classification (4K RPM, 4M TPM) — fast categorization
 */

import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

// Model pool with their rate limits and specialties
export const MODELS = {
  // High-throughput general purpose
  FLASH_25: "gemini-2.5-flash",
  FLASH_3: "gemini-3-flash",
  FLASH_20: "gemini-2.0-flash",
  FLASH_LITE: "gemini-2.0-flash-lite",

  // Deep reasoning
  PRO_25: "gemini-2.5-pro",
  PRO_3: "gemini-3-pro",

  // Embeddings
  EMBEDDING: "gemini-embedding-001",
} as const;

type ModelKey = keyof typeof MODELS;

// Track usage per model for rate limiting
const usageTracker: Record<string, { count: number; resetAt: number }> = {};

const MODEL_LIMITS: Record<string, number> = {
  [MODELS.FLASH_25]: 1000,
  [MODELS.FLASH_3]: 1000,
  [MODELS.FLASH_20]: 2000,
  [MODELS.FLASH_LITE]: 4000,
  [MODELS.PRO_25]: 150,
  [MODELS.PRO_3]: 25,
};

function canUseModel(modelName: string): boolean {
  const now = Date.now();
  const tracker = usageTracker[modelName];
  if (!tracker || now > tracker.resetAt) {
    usageTracker[modelName] = { count: 0, resetAt: now + 60_000 };
    return true;
  }
  return tracker.count < (MODEL_LIMITS[modelName] || 100);
}

function trackUsage(modelName: string) {
  const now = Date.now();
  if (!usageTracker[modelName] || now > usageTracker[modelName].resetAt) {
    usageTracker[modelName] = { count: 1, resetAt: now + 60_000 };
  } else {
    usageTracker[modelName].count++;
  }
}

// Fallback chain: if primary model is rate-limited, try alternatives
const FALLBACK_CHAINS: Record<string, string[]> = {
  [MODELS.FLASH_25]: [MODELS.FLASH_3, MODELS.FLASH_20, MODELS.FLASH_LITE],
  [MODELS.FLASH_3]: [MODELS.FLASH_25, MODELS.FLASH_20, MODELS.FLASH_LITE],
  [MODELS.PRO_25]: [MODELS.PRO_3, MODELS.FLASH_25, MODELS.FLASH_3],
  [MODELS.PRO_3]: [MODELS.PRO_25, MODELS.FLASH_25, MODELS.FLASH_3],
  [MODELS.FLASH_20]: [MODELS.FLASH_25, MODELS.FLASH_3, MODELS.FLASH_LITE],
  [MODELS.FLASH_LITE]: [MODELS.FLASH_20, MODELS.FLASH_25, MODELS.FLASH_3],
};

function selectModel(preferred: string): string {
  if (canUseModel(preferred)) return preferred;
  const chain = FALLBACK_CHAINS[preferred] || [MODELS.FLASH_20];
  for (const fallback of chain) {
    if (canUseModel(fallback)) return fallback;
  }
  return MODELS.FLASH_LITE; // last resort
}

function getModel(modelName: string): GenerativeModel {
  return genAI.getGenerativeModel({ model: modelName });
}

/**
 * Generate text with automatic model selection and fallback.
 */
export async function generateText(
  prompt: string,
  preferredModel: string = MODELS.FLASH_25,
  systemInstruction?: string
): Promise<{ text: string; model: string }> {
  const modelName = selectModel(preferredModel);
  const model = genAI.getGenerativeModel({
    model: modelName,
    ...(systemInstruction ? { systemInstruction } : {}),
  });

  trackUsage(modelName);
  const result = await model.generateContent(prompt);
  const text = result.response.text();
  return { text, model: modelName };
}

/**
 * Generate JSON-structured output.
 */
export async function generateJSON<T = unknown>(
  prompt: string,
  preferredModel: string = MODELS.FLASH_25,
  systemInstruction?: string
): Promise<{ data: T; model: string }> {
  const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON. No markdown, no code blocks, no explanation.`;
  const { text, model } = await generateText(fullPrompt, preferredModel, systemInstruction);

  // Clean JSON from potential markdown wrapping
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  const data = JSON.parse(cleaned) as T;
  return { data, model };
}

/**
 * Task-specific model selection helpers
 */
export const AI = {
  /** Quick classification / scoring — high throughput */
  classify: (prompt: string, system?: string) =>
    generateText(prompt, MODELS.FLASH_LITE, system),

  /** Standard analysis — force multiplier, blight scoring */
  analyze: (prompt: string, system?: string) =>
    generateText(prompt, MODELS.FLASH_25, system),

  /** Deep strategic analysis — executive briefings, cross-module */
  strategize: (prompt: string, system?: string) =>
    generateText(prompt, MODELS.PRO_25, system),

  /** Batch processing — high volume tasks */
  batch: (prompt: string, system?: string) =>
    generateText(prompt, MODELS.FLASH_3, system),

  /** JSON generation for structured data */
  json: <T = unknown>(prompt: string, system?: string) =>
    generateJSON<T>(prompt, MODELS.FLASH_25, system),

  /** Deep JSON analysis */
  deepJson: <T = unknown>(prompt: string, system?: string) =>
    generateJSON<T>(prompt, MODELS.PRO_25, system),

  /** Get model usage stats */
  getUsageStats: () => ({ ...usageTracker }),
};

export default AI;
