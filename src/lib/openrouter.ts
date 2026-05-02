import { env } from "../config/env.js";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

type OpenRouterChoice = {
  message?: {
    content?: string;
  };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const FALLBACK_MODELS = [
  env.OPENROUTER_MODEL,
  "deepseek/deepseek-chat",
  "deepseek/deepseek-r1",
  "deepseek/deepseek-r1-distill-llama-70b"
];

let validatedModel: string | null = null;

function getApiKey() {
  return env.OPENROUTER_API_KEY || env.DEEPSEEK_API_KEY;
}

function buildHeaders(apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  };

  if (env.OPENROUTER_SITE_URL) {
    headers["HTTP-Referer"] = env.OPENROUTER_SITE_URL;
  }

  if (env.OPENROUTER_APP_NAME) {
    headers["X-Title"] = env.OPENROUTER_APP_NAME;
  }

  return headers;
}

async function tryModel(model: string, messages: ChatMessage[]) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return {
      ok: false as const,
      error: "AI assistant is not configured yet. Add OPENROUTER_API_KEY or DEEPSEEK_API_KEY."
    };
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.55,
      max_tokens: 900,
      top_p: 0.8
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    return {
      ok: false as const,
      error: `OpenRouter request failed for ${model}: ${response.status} ${errorText}`
    };
  }

  const data = (await response.json()) as OpenRouterResponse;
  const content = data.choices?.[0]?.message?.content?.trim();

  if (!content) {
    return {
      ok: false as const,
      error: `No response content returned for model ${model}.`
    };
  }

  return {
    ok: true as const,
    content
  };
}

async function resolveModel(messages: ChatMessage[]) {
  if (validatedModel) {
    return validatedModel;
  }

  for (const model of [...new Set(FALLBACK_MODELS)]) {
    const result = await tryModel(model, [{ role: "user", content: "Hello" }]);
    if (result.ok) {
      validatedModel = model;
      return model;
    }
  }

  // Fall back to configured model even if validation failed; the next request will surface the actual error.
  validatedModel = env.OPENROUTER_MODEL;
  return validatedModel;
}

export async function completeChat(messages: ChatMessage[]) {
  const apiKey = getApiKey();

  if (!apiKey) {
    return "AI assistant is not configured yet. Add OPENROUTER_API_KEY or DEEPSEEK_API_KEY to enable DeepSeek concierge replies.";
  }

  const model = await resolveModel(messages);
  const result = await tryModel(model, messages);

  if (result.ok) {
    return result.content;
  }

  for (const fallbackModel of [...new Set(FALLBACK_MODELS)].filter((item) => item !== model)) {
    const fallbackResult = await tryModel(fallbackModel, messages);
    if (fallbackResult.ok) {
      validatedModel = fallbackModel;
      return fallbackResult.content;
    }
  }

  throw new Error(result.error);
}
