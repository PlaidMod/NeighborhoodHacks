// Official logos and seals, downloaded from each body's own website on Oct 20, 2026 and served
// from public/logos/, so a reader's browser never calls those sites. Shown only to identify the
// body; they don't imply endorsement. A body without an entry keeps its icon tile.
//
// Keyed by the plan's body IDs (data/sources.yaml) and by the /app demo data's IDs.

export type BodyLogo = {
  src: string
  /** Wide wordmarks need the whole tile; square seals get a little padding. */
  wide?: boolean
  /** Where the file came from, for anyone who needs to replace it. */
  from: string
}

const HISD: BodyLogo = { src: '/logos/hisd.png', wide: true, from: 'https://www.houstonisd.org' }
const CFISD: BodyLogo = { src: '/logos/cfisd.png', wide: true, from: 'https://www.cfisd.net' }
const HOUSTON: BodyLogo = { src: '/logos/city-of-houston.png', from: 'https://www.houstontx.gov' }
const HARRIS: BodyLogo = { src: '/logos/harris-county.svg', from: 'https://www.harriscountytx.gov' }
const HCFCD: BodyLogo = { src: '/logos/hcfcd.png', from: 'https://www.hcfcd.org' }
const HCC: BodyLogo = { src: '/logos/hcc.png', from: 'https://www.hccs.edu' }
const LONE_STAR: BodyLogo = { src: '/logos/lone-star.png', from: 'https://www.lonestar.edu' }
const HARRIS_HEALTH: BodyLogo = { src: '/logos/harris-health.png', from: 'https://www.harrishealth.org' }
const MUD_489: BodyLogo = { src: '/logos/hcmud-489.png', from: 'https://hcmud489.com' }
const CENTERPOINT: BodyLogo = { src: '/logos/centerpoint.svg', from: 'https://www.centerpointenergy.com' }

const LOGOS: Record<string, BodyLogo> = {
  // Plan body IDs
  hisd_board: HISD,
  cfisd_board: CFISD,
  houston_city_council: HOUSTON,
  commissioners_court: HARRIS,
  flood_control: HCFCD,
  hcc_board: HCC,
  lone_star_board: LONE_STAR,
  hcmud_489: MUD_489,
  centerpoint: CENTERPOINT,
  // /app demo IDs (lib/prototype/bodies.ts)
  hisd: HISD,
  cyfair: CFISD,
  'houston-council': HOUSTON,
  'harris-court': HARRIS,
  hcfcd: HCFCD,
  'harris-health': HARRIS_HEALTH,
  hcc: HCC,
  lonestar: LONE_STAR,
}

export function bodyLogo(id: string | null | undefined): BodyLogo | null {
  return (id && LOGOS[id]) || null
}
