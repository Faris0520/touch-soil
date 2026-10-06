# Touch Soil

An offline garden planner: you pick your climate zone, and an open-weight **Gemma** model running **entirely in your browser** (via [WebLLM](https://github.com/mlc-ai/web-llm)) writes a "what to plant this week" plan. No server, no account, and your garden data never leaves your device.

Built for the [Hacktoberfest Open-Source AI Challenge](https://dev.to/challenges/hacktoberfest-week1-2026-10-05), week 1: Touch Grass.

## Why open

- **Runs with no internet** after the first model download: WebGPU inference in the browser, so it works at the garden, on a trail, or anywhere the signal doesn't.
- **Data stays local**: the zone you pick and what you're growing are never sent anywhere; there is no backend at all.
- **Everything is swappable**: the climate data is a small JSON-style table anyone can fork and correct (frost-date datasets are US-centric, so this one includes tropical wet/dry seasons too), and the model is one string away from being any WebLLM-supported open-weight model.

## How it works

1. `src/data/climates.ts`: a small, honest climate dataset (USDA-style frost zones plus tropical monsoon zones, highland, arid, Mediterranean).
2. `src/lib/planner.ts`: builds a tight prompt from your zone + today's date. If WebGPU is missing, a deterministic rule-based guide takes over so the app is never empty.
3. `src/lib/llm.ts`: loads the smallest prebuilt Gemma model from WebLLM's list, caches it in the browser, and runs the completion on your GPU.
4. The result is rendered from markdown (never injected as HTML).

## Design decisions (one line each)

- Linear-style dark theme per the owner-supplied `DESIGN.md`: a calm tool that reads as a precision instrument, with one acid-lime accent reserved for the primary action.
- Inter + JetBrains Mono per `DESIGN.md`; mono is used only for metadata (model status, week-of line).
- No em dashes anywhere in the product copy; plain sentences instead.
- Empty/loading/error states are all real: model download progress, WebGPU-missing fallback, model-failure fallback.

## Develop

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build    # type-check + production build to dist/
```

A browser with **WebGPU** (Chrome/Edge 113+) is required for the AI part; the offline guide works anywhere. First model load downloads weights (~1 GB) into the browser cache, once.

## Deploy

The build is a static site: any static host works (Render, Netlify, GitHub Pages, Cloudflare Pages). No environment variables, no server.
