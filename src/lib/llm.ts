import * as webllm from '@mlc-ai/web-llm'

export type Progress = (text: string, fraction: number) => void

type Engine = Awaited<ReturnType<typeof createEngine>>

let cachedEngine: Engine | null = null
let cachedModelId: string | null = null

/**
 * Gemma models available in WebLLM's prebuilt list, best-first. Scoring keeps
 * this working as MLC ships new quantizations: smallest Gemma 3 wins, Gemma 2
 * 2B is the backup, q4f16_1 preferred over the heavier f16 builds.
 */
export function listGemmaModels(): string[] {
  return webllm.prebuiltAppConfig.model_list
    .map((m) => m.model_id)
    .filter((id) => /gemma/i.test(id))
    .sort((a, b) => score(b) - score(a))
}

function score(id: string): number {
  let s = 0
  if (/gemma-?3(-|n)/i.test(id) || /gemma-3-/i.test(id)) s += 100
  if (/gemma-?2/i.test(id)) s += 80
  if (/3n-e2b/i.test(id)) s += 30
  if (/-1b/i.test(id)) s += 50
  if (/-2b/i.test(id)) s += 40
  if (/q4f16_1/i.test(id)) s += 20
  if (/q0f16/i.test(id)) s -= 15
  if (/q0f32/i.test(id)) s -= 25
  return s
}

export function hasWebGPU(): boolean {
  return typeof navigator !== 'undefined' && 'gpu' in navigator
}

async function createEngine(modelId: string, onProgress: Progress) {
  // gemma3 prebuilt records ship both context_window_size (override) and
  // sliding_window_size (base config); the engine refuses to run with both
  // positive. Switching the record to sliding-window mode fixes it, per the
  // engine's own guidance, and lets the sequence exceed the 512-token window.
  const appConfig: webllm.AppConfig = {
    ...webllm.prebuiltAppConfig,
    model_list: webllm.prebuiltAppConfig.model_list.map((rec) =>
      rec.model_id === modelId
        ? {
            ...rec,
            overrides: {
              ...rec.overrides,
              context_window_size: -1,
              attention_sink_size: 0,
            },
          }
        : rec,
    ),
  }
  return webllm.CreateMLCEngine(modelId, {
    appConfig,
    initProgressCallback: (report) => onProgress(report.text, report.progress),
  })
}

export async function getEngine(
  modelId: string,
  onProgress: Progress,
): Promise<Engine> {
  if (cachedEngine && cachedModelId === modelId) return cachedEngine
  const engine = await createEngine(modelId, onProgress)
  cachedEngine = engine
  cachedModelId = modelId
  return engine
}

export interface ChatTurn {
  role: 'system' | 'user'
  content: string
}

export interface PlanFormat {
  type: 'json_object'
  schema: string
}

export async function complete(
  engine: Engine,
  messages: ChatTurn[],
  responseFormat?: PlanFormat,
) {
  const res = await engine.chat.completions.create({
    messages,
    temperature: 0.6,
    top_p: 0.9,
    max_tokens: 700,
    ...(responseFormat ? { response_format: responseFormat } : {}),
  })
  return res.choices[0]?.message?.content ?? ''
}
