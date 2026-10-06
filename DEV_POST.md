<!--
Draft for the DEV submission. Fill every [PLACEHOLDER] before publishing.
Required tags: #devchallenge #hf26challenge (add #hacktoberfest #webdev #ai).
Title suggestion: "Touch Soil: an offline garden planner with Gemma running in your browser"
-->

# Touch Soil: an offline garden planner with Gemma running in your browser

## What I Built

**Touch Soil** is a garden planner that tells you what to plant this week, and it runs entirely in your browser. You pick your climate zone, optionally mention what you already grow, and an open-weight **Gemma** model writes a weekly plan: what to plant now, the one job worth doing, and the thing you should skip.

No account. No server. Nothing you type ever leaves your device, because there is no "elsewhere" to send it to. After the first model download, it works with the internet unplugged, which is exactly where a garden usually is.

I built it for this week's theme, Touch Grass: the whole point is that the screen part is short. You open the page, read a plan that takes one minute, and go put your hands in the soil.

## Demo

Deployed app: **[DEPLOYED_URL]**

Note for first load: the Gemma weights (about 1 GB) download once into your browser cache, then load locally from disk. You need a browser with WebGPU (recent Chrome or Edge).

[SCREENSHOT: the app with a generated plan on screen]

[SCREENSHOT or SHORT VIDEO: using it outside, on a phone or laptop, ideally with the garden visible]

## Code

{% github [REPO_URL] %}

The interesting files:

- `src/data/climates.ts`: the climate table. Nine zones, from USDA frost zones to tropical monsoon seasons.
- `src/lib/planner.ts`: the prompt, the JSON schema, and the deterministic offline guide.
- `src/lib/llm.ts`: model selection and the WebLLM engine setup.

## How I Built It

The stack is deliberately boring: Vite, React, TypeScript, plain CSS. All the novelty is in how the AI piece works:

- **You choose where the model runs.** A picker offers two engines for the same open-weight Gemma: downloaded into the browser (WebLLM), or an Ollama server on your own machine. The Ollama path only detects models you have already pulled; it never downloads anything by itself. This also gives browsers without WebGPU a real AI option.
- **Heavy actions ask first.** Before the first browser download (about 1 GB) and before sending your garden details to the local Ollama server, a confirmation panel explains exactly what is about to happen.
- **The model runs in the browser.** [WebLLM](https://github.com/mlc-ai/web-llm) runs open-weight models on your GPU through WebGPU. The app picks the smallest Gemma available in WebLLM's prebuilt list (Gemma 3 1B, quantized) and caches it after the first download.
- **The model cannot break the format.** Small models love to ignore instructions, so instead of trusting prompts I constrain decoding: WebLLM gets a JSON schema via `response_format`, Ollama gets the same schema via its `format` parameter. The model can only emit `{ plants: [{ name, why }], task, skip }`, and the UI renders that structure itself. My first free-form version produced headings like "Plant now (3)" and a greeting, the constrained version cannot.
- **The climate facts are plain data.** Frost-date planners assume USDA zones, which is unhelpful if your garden has a wet season instead of a winter. Touch Soil bundles a small table: four temperate bands, tropical lowland and highland (monsoon wet/dry seasons), arid, and Mediterranean. It is intentionally small and honest about being approximate, and it is a JSON file you can fork and correct for your region.
- **There is a no-AI fallback.** If neither engine can run, a rule-based guide written from the same dataset takes over. The app is never empty.

One war story from the build: Gemma 3's prebuilt WebLLM record ships both a `context_window_size` override and a `sliding_window_size` base config, and the engine refuses to start with both active. The fix (the engine tells you this, to its credit) is switching the record to sliding-window mode with `attention_sink_size: 0`.

## Why Does Open Innovation Matter?

For this project, the open pieces are not a detail, they are the whole argument:

- **It works where the garden is.** No signal, no problem: once cached, the in-browser model runs offline, and the Ollama engine only ever talks to your own machine. A closed API would make the app useless exactly when and where it should be most useful.
- **Your garden stays yours.** What you grow, your zone, your questions: none of it reaches a cloud. The Ollama engine even shows a confirmation naming the exact server your details will go to, and the WebLLM engine shows one before its one-time download.
- **You can swap the brain.** The model is one string in `src/lib/llm.ts`. Want a bigger Gemma, a different open-weight model WebLLM supports, or another local Ollama model? Change a filter or type a name. Want better climate data for your region? Edit a JSON table and open a pull request.
- **It costs nothing to run.** No API bill per plan. The compute is the device you already own.

## My Agent Session

I built this with an AI coding agent, and the session log is here: **[DevRelay session link, if you saved one]**.

## Outdoor Test (bonus)

This is the part the challenge asks for, so: **[YOUR STORY HERE: take a phone or laptop to your garden or balcony, generate a plan, do what it says, and write two or three honest sentences about what happened. Attach photos.]**

## Prize Categories

- Hacktoberfest Open-Source AI Challenge, Week 1: Touch Grass (main entry)
- Gemma (the planner runs on an open-weight Gemma model in the browser)
- Render (the app is deployed on Render: **[DEPLOYED_URL]**)

<!-- Reminder before publishing: replace every [PLACEHOLDER], attach screenshots,
    set the two required tags, and re-read the post once out loud. -->
