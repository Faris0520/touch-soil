export type RegionKind = 'temperate' | 'tropical' | 'arid' | 'mediterranean'

export interface ClimateZone {
  id: string
  label: string
  kind: RegionKind
  exampleRegions: string
  /** Temperate: average last frost in spring, e.g. "late April" */
  lastFrost?: string
  /** Temperate: average first frost in autumn, e.g. "mid October" */
  firstFrost?: string
  /** Tropical: months that make up the wet season */
  wetSeason?: string
  drySeason?: string
  /** Short honest note about the approximation */
  notes: string
}

/**
 * A deliberately small, illustrative dataset. The point of the app is that the
 * climate "facts" are plain data anyone can read, fork, and correct, not a
 * proprietary black box. Frost months follow rough USDA-zone conventions;
 * tropical seasons follow monsoon patterns around the equator.
 */
export const ZONES: ClimateZone[] = [
  {
    id: 'z34',
    label: 'Very cold (USDA zones 3–4)',
    kind: 'temperate',
    exampleRegions: 'Interior Canada, Alaska, northern Scandinavia',
    lastFrost: 'late May',
    firstFrost: 'early September',
    notes: 'Short season: every frost-free week counts.',
  },
  {
    id: 'z56',
    label: 'Cold (USDA zones 5–6)',
    kind: 'temperate',
    exampleRegions: 'US Midwest, central Europe, Poland, UK inland',
    lastFrost: 'mid May',
    firstFrost: 'mid October',
    notes: 'Classic four-season gardening; spring and fall are busy.',
  },
  {
    id: 'z78',
    label: 'Temperate (USDA zones 7–8)',
    kind: 'temperate',
    exampleRegions: 'US Mid-Atlantic, southern Europe inland, southern England',
    lastFrost: 'mid April',
    firstFrost: 'early November',
    notes: 'Long enough for two seasons of cool crops.',
  },
  {
    id: 'z910',
    label: 'Mild (USDA zones 9–10)',
    kind: 'temperate',
    exampleRegions: 'Mediterranean coast, northern California, southern Australia',
    lastFrost: 'late February',
    firstFrost: 'early December',
    notes: 'Winters are the main growing season here.',
  },
  {
    id: 'z11',
    label: 'Frost-free subtropical (zone 11+)',
    kind: 'tropical',
    exampleRegions: 'South Florida, coastal Peru, parts of coastal Australia',
    wetSeason: 'June to October (varies)',
    drySeason: 'November to May (varies)',
    notes: 'No frost: heat and rain set the calendar instead.',
  },
  {
    id: 'trop-low',
    label: 'Tropical lowland (monsoon)',
    kind: 'tropical',
    exampleRegions: 'Jakarta, Bangkok, Manila, Lagos',
    wetSeason: 'November to March',
    drySeason: 'April to October',
    notes: 'Plant just before the wet season; watch for waterlogging.',
  },
  {
    id: 'trop-high',
    label: 'Tropical highland',
    kind: 'tropical',
    exampleRegions: 'Bandung, Bogotá, Nairobi, Addis Ababa',
    wetSeason: 'November to March',
    drySeason: 'April to October',
    notes: 'Cool nights, no frost: good for greens year-round.',
  },
  {
    id: 'arid',
    label: 'Arid / desert',
    kind: 'arid',
    exampleRegions: 'Phoenix, Riyadh, Alice Springs',
    lastFrost: 'rare, light',
    firstFrost: 'rare, light',
    notes: 'Avoid summer heat; autumn through spring is prime time.',
  },
  {
    id: 'medit',
    label: 'Mediterranean',
    kind: 'mediterranean',
    exampleRegions: 'Spain, Italy, Greece, Cape Town, coastal California',
    wetSeason: 'October to March (mild)',
    drySeason: 'April to September (hot, dry)',
    notes: 'Two planting windows: autumn and early spring.',
  },
]

export const zoneById = (id: string): ClimateZone =>
  ZONES.find((z) => z.id === id) ?? ZONES[0]

export function zoneFacts(z: ClimateZone): string {
  if (z.kind === 'temperate') {
    return `${z.label}. Average last spring frost: ${z.lastFrost}. Average first autumn frost: ${z.firstFrost}. ${z.notes} Examples: ${z.exampleRegions}.`
  }
  if (z.kind === 'tropical') {
    return `${z.label}. No frost. Wet season: ${z.wetSeason}. Dry season: ${z.drySeason}. ${z.notes} Examples: ${z.exampleRegions}.`
  }
  if (z.kind === 'arid') {
    return `${z.label}. Frost: ${z.lastFrost ?? 'rare'}. Summers are extremely hot and dry. ${z.notes} Examples: ${z.exampleRegions}.`
  }
  return `${z.label}. Wet mild season: ${z.wetSeason}. Hot dry season: ${z.drySeason}. ${z.notes} Examples: ${z.exampleRegions}.`
}
