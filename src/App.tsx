import { useState } from 'react'
import { ZONES, zoneById } from './data/climates'
import { buildMessages, fallbackPlan } from './lib/planner'
import { complete, getEngine, hasWebGPU, listGemmaModels } from './lib/llm'
import { renderMarkdown } from './lib/markdown'

type Phase = 'idle' | 'loading' | 'generating' | 'done' | 'error'

const SproutGlyph = () => (
  <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
    <path
      d="M16 27c0-7 0-10-8-15 0 9 3 13 8 15zm0 0c0-7 0-10 8-15 0 9-3 13-8 15z"
      fill="var(--color-lime)"
    />
  </svg>
)

const statusFor = (
  phase: Phase,
  modelId: string,
  fraction: number,
  usedFallback: boolean,
): string => {
  if (phase === 'loading') return `loading ${Math.round(fraction * 100)}%`
  if (phase === 'generating') return 'thinking'
  if (phase === 'done') return usedFallback ? 'offline guide' : modelId
  return 'model not loaded'
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [zoneId, setZoneId] = useState(ZONES[5].id)
  const [growing, setGrowing] = useState('')
  const [progressText, setProgressText] = useState('')
  const [fraction, setFraction] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [output, setOutput] = useState('')
  const [usedFallback, setUsedFallback] = useState(false)

  const [modelId] = useState(() => listGemmaModels()[0] ?? '')

  async function runPlan() {
    setErrorMsg('')
    setOutput('')
    setUsedFallback(false)

    if (!hasWebGPU()) {
      setErrorMsg(
        'This browser has no WebGPU, so the local model cannot run here. You can still use the bundled offline guide.',
      )
      setOutput(fallbackPlan(zoneById(zoneId), growing, new Date()))
      setUsedFallback(true)
      setPhase('done')
      return
    }
    if (!modelId) {
      setErrorMsg('No Gemma model found in the WebLLM prebuilt list.')
      setPhase('error')
      return
    }

    try {
      setPhase('loading')
      setFraction(0)
      setProgressText('starting')
      const engine = await getEngine(modelId, (text, frac) => {
        setProgressText(text)
        setFraction(frac)
      })
      setPhase('generating')
      const answer = await complete(engine, buildMessages(zoneById(zoneId), growing, new Date()))
      if (!answer.trim()) throw new Error('the model returned an empty answer')
      setOutput(answer)
      setPhase('done')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err))
      setPhase('error')
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

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">
          <SproutGlyph />
          Touch Soil
        </div>
        <span className="model-status">model: {statusFor(phase, modelId, fraction, usedFallback)}</span>
      </nav>

      <header className="hero">
        <h1>Know what to plant this week.</h1>
        <p>
          Touch Soil turns your climate zone into a weekly garden plan, written by an
          open-weight Gemma model running entirely in your browser. No account, no
          server, and your garden never leaves your device.
        </p>
      </header>

      <main>
        <section className="panel" aria-label="Garden details">
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
              onClick={runPlan}
              disabled={busy}
            >
              {busy ? 'Working' : 'Grow my plan'}
            </button>
            {phase === 'error' && (
              <button type="button" className="btn-ghost" onClick={runFallback}>
                Use the offline guide
              </button>
            )}
          </div>

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
              Writing this week's plan on your GPU.
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
              week of {today} · {zone.label} · {usedFallback ? 'bundled offline guide' : 'Gemma, generated locally'}
            </p>
            <div className="result-body">{renderMarkdown(output)}</div>
            <div className="result-foot">
              <span className="local-note">
                {usedFallback
                  ? 'Static guide from the data bundled in this repo.'
                  : 'Generated on this device. Nothing was sent anywhere.'}
              </span>
              <button type="button" className="btn-ghost" onClick={runPlan} disabled={busy}>
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
          </a>
          . Climate data: a small JSON file bundled in this repo, free to fork and fix.
        </p>
      </footer>
    </div>
  )
}
