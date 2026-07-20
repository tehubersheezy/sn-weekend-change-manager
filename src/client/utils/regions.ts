import type { ChangeRecord } from '../types'
import { display } from './fields'

/**
 * Which region a change belongs to, for the grid's grouped rendering.
 *
 * ⚠️ PLACEHOLDER LOGIC. Abey has a specific region rule he hasn't described yet
 * ("there's a specific logic to it — I'll describe it later"). Until it lands,
 * region is inferred from the assignment group's NAME: a group carrying a
 * recognisable region/city token lands in that region ("NY DB" → Americas),
 * everything else falls to Global. On the dev421992 seed data that yields two
 * bands — Americas (the NY DB changes) and Global (the rest) — enough to see
 * the grouped grid working without inventing semantics the data doesn't have.
 *
 * When the real rule arrives, replace regionForChange's BODY (and the token
 * table if it's obsolete). The signature plus REGION_ORDER are the whole
 * contract: while the grid's "Group by region" option is on, rows sort by
 * regionRank, one section band paints per distinct label, and the whole-table
 * copy carries the label in a leading "Region" column. With the option off
 * (the default) this function still runs but only fills a dormant row field.
 */

const REGION_TOKENS: [region: string, pattern: RegExp][] = [
  ['APAC', /\b(apac|asia|hk|hong ?kong|tokyo|singapore|sydney|shanghai|mumbai)\b/],
  ['EMEA', /\b(emea|europe|zug|zurich|zürich|london|frankfurt|paris|dublin)\b/],
  ['Americas', /\b(amer|americas|ny|nyc|new ?york|us|usa|chicago|toronto|montreal|greenwich)\b/],
]

/** Fallback when nothing about the change names a region. */
export const GLOBAL_REGION = 'Global'

/** Presentation order — the console's world-clock order (HK, Zug, NY), Global last. */
export const REGION_ORDER = ['APAC', 'EMEA', 'Americas', GLOBAL_REGION]

/** Sort key for region labels; labels outside REGION_ORDER sort after it. */
export function regionRank(region: string): number {
  const i = REGION_ORDER.indexOf(region)
  return i === -1 ? REGION_ORDER.length : i
}

export function regionForChange(change: ChangeRecord): string {
  const group = display(change.assignment_group).toLowerCase()
  for (const [region, pattern] of REGION_TOKENS) {
    if (pattern.test(group)) return region
  }
  return GLOBAL_REGION
}
