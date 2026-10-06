import { useEffect, useRef, useState } from 'react'
import { ZONES, zoneById } from './data/climates'
import {
  PLAN_FORMAT,
  PLAN_SCHEMA,
  buildMessages,
  fallbackPlan,
  parsePlan,
  planToMarkdown,
} from './lib/planner'
import {
  DEFAULT_OLLAMA_URL,
  complete,
  completeViaOllama,
  getEngine,
  hasWebGPU,
  isEngineLoaded,
  listGemmaModels,
  listOllamaGemmaModels,
} from './lib/llm'
import { renderMarkdown } from './lib/markdown'

type Phase = 'idle' | 'loading' | 'generating' | 'done' | 'error'
type EngineChoice = 'webllm' | 'ollama'
type OllamaStatus = 'idle' | 'checking' | 'ok' | 'unreachable' | 'no-gemma'
type PendingConfirm = 'webllm-download' | 'ollama-send' | null

const SproutGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
    <path
      d="M16 27c0-7 0-10-8-15 0 9 3 13 8 15zm0 0c0-7 0-10 8-15 0 9-3 13-8 15z"
      fill="var(--color-lime)"
    />
  </svg>
)

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [zoneId, setZoneId] = useState(ZONES[5].id)
  const [growing, setGrowing] = useState('')
  const [progressText, setProgressText] = useState('')
  const [fraction, setFraction] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [output, setOutput] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)

  const [engine, setEngine] = useState<EngineChoice>('webllm')
  const [modelId] = useState(() => listGemmaModels()[0] ?? '')
  const [webllmConfirmed, setWebllmConfirmed] = useState(false)
  const [ollamaConfirmed, setOllamaConfirmed] = useState(false)

  const [ollamaUrl, setOllamaUrl] = useState(DEFAULT_OLLAMA_URL)
  const [ollamaModels, setOllamaModels] = useState<string[]>([])
  const [ollamaModel, setOllamaModel] = useState('')
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('idle')
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null)
  const confirmButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (pendingConfirm && confirmButtonRef.current) {
      confirmButtonRef.current.focus()
    }
  }, [pendingConfirm])

  async function checkOllama(url: string) {
    setOllamaStatus('checking')
    try {
      const models = await listOllamaGemmaModels(url)
      setOllamaModels(models)
      if (models.length === 0) {
        setOllamaStatus('no-gemma')
      } else {
        setOllamaModel((current) => (models.includes(current) ? current : models[0]))
        setOllamaStatus('ok')
      }
    } catch {
      setOllamaModels([])
      setOllamaStatus('unreachable')
    }
  }

  function switchEngine(next: EngineChoice) {
    setEngine(next)
    setErrorMsg('')
    if (next === 'ollama' && ollamaStatus === 'idle') {
      void checkOllama(ollamaUrl)
    }
  }

  async function runWebllm() {
    try {
      setPhase('loading')
      setFraction(0)
      setProgressText('starting')
      const eng = await getEngine(modelId, (text, frac) => {
        setProgressText(text)
        setFraction(frac)
      })
      setPhase('generating')
      const answer = await complete(
        eng,
        buildMessages(zoneById(zoneId), growing, new Date()),
        PLAN_FORMAT,
      )
      finishWithPlan(answer, 'webllm')
    } catch (err) {
      showError(err, 'webllm')
    }
  }

  async function runOllama() {
    try {
      setPhase('generating')
      const answer = await completeViaOllama(
        ollamaUrl,
        ollamaModel,
        buildMessages(zoneById(zoneId), growing, new Date()),
        PLAN_SCHEMA,
      )
      finishWithPlan(answer, 'ollama')
    } catch (err) {
      showError(err, 'ollama')
    }
  }

  function finishWithPlan(rawAnswer: string, source: 'webllm' | 'ollama') {
    let plan
    try {
      plan = parsePlan(rawAnswer)
    } catch {
      setErrorMsg(
        `The model ${source === 'ollama' ? 'at ' + ollamaUrl : ''}returned data that does not match the plan schema. Try again, or use the offline guide.`,
      )
      setPhase('error')
      return
    }
    setOutput(planToMarkdown(plan))
    setUsedFallback(false)
    setPhase('done')
  }

  function showError(err: unknown, source: 'webllm' | 'ollama') {
    const msg =
      err instanceof Error
        ? err.message
        : typeof err === 'object' && err !== null
          ? JSON.stringify(err)
          : String(err)
    const crashed = /ExitStatus|terminated/i.test(msg)
    if (source === 'webllm' && crashed) {
      setErrorMsg(
        'The AI runtime crashed on this GPU setup. Reload the page and try again; the model is already cached, so it will load fast. The offline guide below always works, and the Ollama engine is another way around this.',
      )
    } else if (source === 'ollama') {
      setErrorMsg(
        `Could not get a plan from Ollama at ${ollamaUrl}. Make sure it is running ("ollama serve") and that a Gemma model is pulled ("ollama pull gemma3:1b"). If this page is not served from localhost, start Ollama with OLLAMA_ORIGINS set to this page's origin.`,
      )
    } else {
      setErrorMsg(msg || 'unknown error')
    }
    setPhase('error')
  }

  function requestPlan() {
    setErrorMsg('')
    if (engine === 'webllm') {
      if (!hasWebGPU()) {
        setErrorMsg(
          'This browser has no WebGPU, so the in-browser model cannot run here. Switch the engine to Ollama, or use the bundled offline guide.',
        )
        setOutput(fallbackPlan(zoneById(zoneId), growing, new Date()))
        setUsedFallback(true)
        setPhase('done')
        return
      }
      if (!isEngineLoaded() && !webllmConfirmed) {
        setPendingConfirm('webllm-download')
        return
      }
      void runWebllm()
    } else {
      if (ollamaStatus !== 'ok' || !ollamaModel) {
        void checkOllama(ollamaUrl).then(() => {
          setErrorMsg(
            'No Ollama model is available yet. Install one with "ollama pull gemma3:1b", then check again.',
          )
          setPhase('error')
        })
        return
      }
      if (!ollamaConfirmed) {
        setPendingConfirm('ollama-send')
        return
      }
      void runOllama()
    }
  }

  function confirmPending() {
    const action = pendingConfirm
    setPendingConfirm(null)
    if (action === 'webllm-download') {
      setWebllmConfirmed(true)
      void runWebllm()
    } else if (action === 'ollama-send') {
      setOllamaConfirmed(true)
      void runOllama()
    }
  }

  function runFallback() {
    setErrorMsg('')
    setOutput(fallbackPlan(zoneById(zoneId), growing, new Date()))
    setUsedFallback(true)
    setPhase('done')
  }

  const zone = zoneById(zoneId)
  const busy = phase === 'loading' || phase === 'generating'
  const today = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const modelStatus = (() => {
    if (engine === 'ollama') {
      if (pendingConfirm === 'ollama-send') return 'ollama: awaiting confirmation'
      if (phase === 'generating') return `ollama: ${ollamaModel}`
      return `ollama: ${ollamaStatus === 'ok' ? ollamaModel : ollamaStatus}`
    }
    if (phase === 'loading') return `loading ${Math.round(fraction * 100)}%`
    if (phase === 'generating') return 'thinking'
    if (phase === 'done' && !usedFallback && isEngineLoaded()) return modelId
    return 'model not loaded'
  })()

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">
          <SproutGlyph />
          Touch Soil
        </div>
        <span className="model-status">{modelStatus}</span>
      </nav>

      <header className="hero">
        <h1>Know what to plant this week.</h1>
        <p>
          Touch Soil turns your climate zone into a weekly garden plan, written by an
          open-weight Gemma model. Pick where it runs: downloaded into this browser, or
          through Ollama on your own machine. Either way, nothing goes to a cloud.
        </p>
      </header>

      <main>
        <section className="panel" aria-label="Garden details">
          <fieldset className="engine-picker">
            <legend className="field-label">Where should the model run?</legend>
            <div className="segmented" role="radiogroup" aria-label="Engine">
              <label className="segment">
                <input
                  type="radio"
                  name="engine"
                  value="webllm"
                  checked={engine === 'webllm'}
                  onChange={() => switchEngine('webllm')}
                  disabled={busy}
                />
                In this browser
              </label>
              <label className="segment">
                <input
                  type="radio"
                  name="engine"
                  value="ollama"
                  checked={engine === 'ollama'}
                  onChange={() => switchEngine('ollama')}
                  disabled={busy}
                />
                Ollama on this machine
              </label>
            </div>
            <span className="field-hint">
              {engine === 'webllm'
                ? 'Downloads Gemma into this browser (about 1 GB, once), then runs on your GPU, even offline.'
                : 'Uses a Gemma model already installed in Ollama. No browser download, and it also works without WebGPU.'}
            </span>
          </fieldset>

          {engine === 'ollama' && (
            <div className="ollama-row">
              <label className="field">
                <span className="field-label">Ollama server address</span>
                <input
                  type="text"
                  className="text-input"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  onBlur={() => void checkOllama(ollamaUrl)}
                  disabled={busy}
                  spellCheck={false}
                />
              </label>
              {ollamaStatus === 'ok' && ollamaModels.length > 1 && (
                <label className="field">
                  <span className="field-label">Model</span>
                  <select
                    value={ollamaModel}
                    onChange={(e) => setOllamaModel(e.target.value)}
                    disabled={busy}
                  >
                    {ollamaModels.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <p className="ollama-status" role="status">
                {ollamaStatus === 'checking' && 'Checking the local Ollama server.'}
                {ollamaStatus === 'ok' &&
                  `Connected. Found ${ollamaModels.length} Gemma model${ollamaModels.length === 1 ? '' : 's'}.`}
                {ollamaStatus === 'unreachable' &&
                  'Not reachable. Start it with "ollama serve", then check again.'}
                {ollamaStatus === 'no-gemma' &&
                  'No Gemma model found. Run "ollama pull gemma3:1b", then check again.'}
                {ollamaStatus === 'idle' && 'Not checked yet.'}
              </p>
              {(ollamaStatus === 'unreachable' || ollamaStatus === 'no-gemma') && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => void checkOllama(ollamaUrl)}
                  disabled={busy}
                >
                  Check again
                </button>
              )}
            </div>
          )}

          <label className="field">
            <span className="field-label">Your climate</span>
            <select
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              disabled={busy}
            >
              {ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
            <span className="field-hint">{zone.exampleRegions}</span>
          </label>

          <label className="field">
            <span className="field-label">Already growing (optional)</span>
            <textarea
              value={growing}
              onChange={(e) => setGrowing(e.target.value)}
              placeholder="chili, one lemon tree, some basil"
              maxLength={120}
              disabled={busy}
            />
          </label>

          <div className="actions">
            <button
              type="button"
              className="btn-primary"
              onClick={requestPlan}
              disabled={busy || pendingConfirm !== null}
            >
              {busy ? 'Working' : 'Grow my plan'}
            </button>
            {phase === 'error' && (
              <button type="button" className="btn-ghost" onClick={runFallback}>
                Use the offline guide
              </button>
            )}
          </div>

          {pendingConfirm && (
            <div
              className="confirm-box"
              role="dialog"
              aria-label="Confirmation"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setPendingConfirm(null)
              }}
            >
              {pendingConfirm === 'webllm-download' ? (
                <>
                  <strong>Download the model once?</strong>
                  <p>
                    Gemma (about 1 GB) will download into this browser's cache and then
                    run on your GPU, including offline. Nothing leaves this device.
                  </p>
                </>
              ) : (
                <>
                  <strong>Send your garden to Ollama?</strong>
                  <p>
                    Your climate zone and what you grow will be sent to the Ollama
                    server at {ollamaUrl} on this machine, and nowhere else.
                  </p>
                </>
              )}
              <div className="confirm-actions">
                <button
                  type="button"
                  className="btn-primary"
                  ref={confirmButtonRef}
                  onClick={confirmPending}
                >
                  {pendingConfirm === 'webllm-download' ? 'Download once' : 'Send to Ollama'}
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setPendingConfirm(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {busy && phase === 'loading' && (
            <div className="progress" role="status" aria-live="polite">
              <div
                className="progress-track"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(fraction * 100)}
              >
                <div className="progress-fill" style={{ width: `${Math.max(3, fraction * 100)}%` }} />
              </div>
              <p className="progress-text">
                First run downloads the model once (about 1 GB), then it works offline.{' '}
                {progressText}
              </p>
            </div>
          )}
          {busy && phase === 'generating' && (
            <p className="progress-text" role="status" aria-live="polite">
              {engine === 'ollama'
                ? 'Waiting for Ollama to finish on this machine.'
                : "Writing this week's plan on your GPU."}
            </p>
          )}

          {phase === 'error' && errorMsg && (
            <div className="error-box" role="alert">
              <strong>Could not run the model</strong>
              {errorMsg}
            </div>
          )}
        </section>

        {phase === 'done' && output && (
          <section className="result" aria-label="This week's plan">
            <p className="result-meta">
              week of {today} · {zone.label} ·{' '}
              {usedFallback ? 'bundled offline guide' : engine === 'ollama' ? `Ollama (${ollamaModel})` : 'Gemma in this browser'}
            </p>
            <div className="result-body">{renderMarkdown(output)}</div>
            <div className="result-foot">
              <span className="local-note">
                {usedFallback
                  ? 'Static guide from the data bundled in this repo.'
                  : engine === 'ollama'
                    ? `Generated by Ollama on this machine. Only this page and your Ollama server were involved.`
                    : 'Generated in this browser. Nothing was sent anywhere.'}
              </span>
              <button type="button" className="btn-ghost" onClick={requestPlan} disabled={busy}>
                Ask again
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>
          Built for the{' '}
          <a
            href="https://dev.to/challenges/hacktoberfest-week1-2026-10-05"
            target="_blank"
            rel="noreferrer"
          >
            Hacktoberfest Open-Source AI Challenge
          </a>
          , week 1: Touch Grass. Model weights: open-weight Gemma via{' '}
          <a href="https://github.com/mlc-ai/web-llm" target="_blank" rel="noreferrer">
            WebLLM
          </a>{' '}
          or{' '}
          <a href="https://ollama.com" target="_blank" rel="noreferrer">
            Ollama
          </a>
          . Climate data: a small JSON file bundled in this repo, free to fork and fix.
        </p>
      </footer>
    </div>
  )
}
