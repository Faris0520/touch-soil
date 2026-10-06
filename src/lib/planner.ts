import { zoneFacts, type ClimateZone } from '../data/climates'
import type { ChatTurn, PlanFormat } from './llm'

const SYSTEM_PROMPT = [
  'You are an expert local gardener.',
  'Given today\u2019s date, the garden\u2019s climate facts, and what is already growing,',
  'output JSON with: plants (3 to 5 items, each with name and why, where why is one',
  'short sentence on why this crop suits this week and how to start it), task (the',
  'single most useful job in the garden this week), and skip (one tempting job that',
  'is wrong to do this week). Use only the climate facts given. Real crop names,',
  'short sentences, no extra text.',
].join(' ')

/** Grammar-constrained shape: both engines must emit exactly this structure. */
export const PLAN_SCHEMA: Record<string, unknown> = {
  type: 'object',
  properties: {
    plants: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['name', 'why'],
      },
    },
    task: { type: 'string' },
    skip: { type: 'string' },
  },
  required: ['plants', 'task', 'skip'],
}

export const PLAN_FORMAT: PlanFormat = {
  type: 'json_object',
  schema: JSON.stringify(PLAN_SCHEMA),
}

export interface WeeklyPlan {
  plants: { name: string; why: string }[]
  task: string
  skip: string
}

export function parsePlan(raw: string): WeeklyPlan {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  const plan = JSON.parse(trimmed) as WeeklyPlan
  if (!Array.isArray(plan.plants) || plan.plants.length === 0) {
    throw new Error('malformed plan')
  }
  return {
    plants: plan.plants
      .filter((p) => p && typeof p.name === 'string')
      .slice(0, 5),
    task: String(plan.task ?? ''),
    skip: String(plan.skip ?? ''),
  }
}

export function planToMarkdown(plan: WeeklyPlan): string {
  const bullets = plan.plants.map((p) => `- **${p.name}.** ${p.why}`)
  return [
    '## Plant now',
    ...bullets,
    '',
    '## This week\u2019s task',
    `- ${plan.task}`,
    '',
    '## Skip for now',
    `- ${plan.skip}`,
  ].join('\n')
}

export function buildMessages(
  zone: ClimateZone,
  alreadyGrowing: string,
  now: Date,
): ChatTurn[] {
  const today = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const growing = alreadyGrowing.trim()
    ? ` Already growing here: ${alreadyGrowing.trim()}. Weave one care job for one of these into the task.`
    : ''
  return [
    { role: 'system', content: SYSTEM_PROMPT },
    {
      role: 'user',
      content: `Today is ${today}. My garden's climate: ${zoneFacts(zone)}${growing} What should I plant this week? Answer with the JSON only.`,
    },
  ]
}

const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Deterministic offline guide, used when WebGPU is unavailable or the model fails. */
export function fallbackPlan(
  zone: ClimateZone,
  alreadyGrowing: string,
  now: Date,
): string {
  const m = now.getMonth()
  const lines: string[] = []
  const note = alreadyGrowing.trim()
    ? ` (And give ${alreadyGrowing.trim().split(',')[0]} a check for water and pests.)`
    : ''

  if (zone.kind === 'temperate') {
    if (m >= 2 && m <= 4) {
      lines.push(
        'Spring: beds are waking up.',
        '## Plant now',
        '- Lettuce and spinach. Direct sow as soon as soil can be worked; they tolerate cold nights.',
        '- Radishes. Fastest win of the season, ready in about a month.',
        '- Peas. Sow now while the soil is still cool; give them something to climb.',
        '- Tomatoes and peppers. Start indoors only if your last frost is still weeks away.',
      )
    } else if (m >= 5 && m <= 7) {
      lines.push(
        'Summer: keep the harvest coming.',
        '## Plant now',
        '- Bush beans. Sow in short rows every few weeks for a steady supply.',
        '- Carrots and beets. A mid-summer sowing matures in autumn coolness.',
        '- Cucumbers or zucchini. One or two plants is plenty; sow directly.',
      )
    } else if (m >= 8 && m <= 10) {
      lines.push(
        'Autumn: the second planting window.',
        '## Plant now',
        '- Garlic. Plant cloves a few weeks before the ground freezes; mulch after.',
        '- Cover crops. Rye or clover protects bare soil over winter.',
        '- Onions (overwintering types). Set them out now in mild zones.',
        '- Spring bulbs. Garlic now, tulips and daffodils before the first hard freeze.',
      )
    } else {
      lines.push(
        'Winter: plan and prep.',
        '## Plant now',
        '- Nothing outdoors in most of this zone; plan instead.',
        '- Order seed. Decide varieties now while stock is fresh.',
        '- Sprouts or microgreens indoors. A windowsill tray keeps hands busy.',
        '- Prune dormant fruit trees on a dry, mild day.',
      )
    }
    lines.push(
      '## This week\u2019s task',
      `- Clear spent plants and mulch empty beds before the first frost (${zone.firstFrost ?? 'check local averages'}).${note}`,
      '## Skip for now',
      '- Tender summer crops; any new planting outdoors will likely be lost to frost.',
    )
  } else if (zone.kind === 'tropical') {
    if (m >= 9 || m <= 1) {
      lines.push(
        'Wet season window: plant as the rains arrive, but keep drainage sharp.',
        '## Plant now',
        '- Kangkung (water spinach). Loves the rain and is ready in weeks.',
        '- Tomatoes (heat-tolerant varieties). Start in trays; transplant after the heaviest rains pass.',
        '- Chili. Plant now and it fruits through the season.',
        '- Moringa or katuk cuttings. Woody cuttings root fast in humid weather.',
      )
    } else {
      lines.push(
        'Dry season: water is the constraint.',
        '## Plant now',
        '- Mulch everything. A thick layer cuts watering in half.',
        '- Green beans. Quick, productive, and tolerant if you water steadily.',
        '- Amaranth (bayam). Handles heat better than most greens.',
        '- Citrus or papaya. Plant early in the dry season so roots settle before the rains.',
      )
    }
    lines.push(
      '## This week\u2019s task',
      `- Check drainage in every bed; standing water from ${zone.wetSeason ?? 'the wet season'} rots roots faster than drought does.${note}`,
      '## Skip for now',
      '- Temperate crops like spinach or broccoli in the lowland heat; they will bolt or rot.',
    )
  } else if (zone.kind === 'arid') {
    lines.push(
      'Desert calendar: grow from autumn through spring, rest in extreme heat.',
      '## Plant now',
      '- Radishes and carrots. Sow now; the cooling soil suits root crops.',
      '- Lettuce and greens. Afternoon shade cloth keeps them from bolting.',
      '- Citrus. Plant while the worst heat is over so roots establish.',
      '- Herbs (mint in a pot, basil in ground). Both thrive with morning sun.',
    )
    lines.push(
      '## This week\u2019s task',
      `- Rebuild mulch and check drip irrigation before the dry season ramps up.${note}`,
      '## Skip for now',
      '- Summer heat crops planted late; they will struggle in the coming heat or cold snaps.',
    )
  } else {
    lines.push(
      'Mediterranean calendar: two windows, autumn is the big one.',
      '## Plant now',
      '- Brassicas. Broccoli, cabbage, kale transplants thrive in the mild wet months ahead.',
      '- Fava beans. Sow now for a spring harvest; they improve the soil too.',
      '- Lettuce and spinach. Grow fast in the cooling, wetter weeks.',
      '- Olive or fruit trees. Autumn rain does the watering for you.',
    )
    lines.push(
      '## This week\u2019s task',
      `- Top up mulch and set up rain capture before ${zone.wetSeason ?? 'the wet season'} begins.${note}`,
      '## Skip for now',
      '- Summer crops like melons; the season is closing, not opening.',
    )
  }
  return [
    `Offline guide for ${zone.label} in ${MONTH[m]}, written for when the AI model is not available. It is generic; the local model is more specific.`,
    ...lines,
  ].join('\n\n')
}
