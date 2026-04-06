import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || undefined,
    });
  }
  return openaiClient;
}

interface CallLLMOptions {
  system: string;
  user: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

interface LLMResult {
  content: string;
  tokensUsed: number;
}

export async function callLLM(options: CallLLMOptions): Promise<LLMResult> {
  const {
    system,
    user,
    model = process.env.LLM_MODEL || 'gpt-4o',
    temperature = 0.2,
    maxTokens = 4096,
    jsonMode = false,
  } = options;

  const client = getOpenAIClient();

  const response = await client.chat.completions.create({
    model,
    temperature,
    max_tokens: maxTokens,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
  });

  const content = response.choices[0]?.message?.content ?? '';
  const tokensUsed = response.usage?.total_tokens ?? 0;

  return { content, tokensUsed };
}

export function extractJSON<T>(text: string): T {
  // Remove markdown code fences if present
  const stripped = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  return JSON.parse(stripped) as T;
}
