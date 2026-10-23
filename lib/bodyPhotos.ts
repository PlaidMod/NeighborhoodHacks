// Photos for timeline cards. They're real places in Houston, from Wikimedia Commons under
// licenses that allow reuse, downloaded once (Oct 22, 2026) and served from public/photos/, so a
// reader's browser never contacts another site. Each shows a body's own landmark or what it works
// on (a bayou for Flood Control), never the meeting or a news story, and every card shows the credit.
// The county photo is the restored 1910 courthouse, a county landmark, not where the court meets.
//
// Keyed by the plan's body IDs and the /app demo data's IDs. Anything else falls back by kind.

export type BodyPhoto = { src: string; credit: string; source: string }

const PHOTOS = {
  cityhall: {
    src: "/photos/cityhall.jpg",
    credit: "Ed Uthman, CC BY 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Houston_City_Hall_from_Hermann_Square_(HDR).jpg",
  },
  hisdhq: {
    src: "/photos/hisdhq.jpg",
    credit: "WhisperToMe, public domain",
    source: "https://commons.wikimedia.org/wiki/File:HoustonISDWhiteHQ.jpg",
  },
  busstop: {
    src: "/photos/busstop.jpg",
    credit: "WhisperToMe, CC0",
    source: "https://commons.wikimedia.org/wiki/File:Bus_stop_outside_Lamar_High_School_(Houston).jpg",
  },
  courthouse: {
    src: "/photos/courthouse.jpg",
    credit: "i_am_jim, CC BY-SA 3.0",
    source: "https://commons.wikimedia.org/wiki/File:Harris_County_1910_Courthouse_Restored_Houston_Texas.jpg",
  },
  bayou: {
    src: "/photos/bayou.jpg",
    credit: "Patrick Feller, CC BY 2.0",
    source: "https://commons.wikimedia.org/wiki/File:Brays_Bayou,_Houston,_Texas.jpg",
  },
  skyline: {
    src: "/photos/skyline.jpg",
    credit: "David Daniel Turner, CC BY 4.0",
    source: "https://commons.wikimedia.org/wiki/File:Downtown_Houston,_TX_Skyline_-_2018.jpg",
  },
} satisfies Record<string, BodyPhoto>

/** Photos of a specific body's own building or area. */
const BY_BODY: Record<string, BodyPhoto> = {
  hisd_board: PHOTOS.hisdhq,
  hisd: PHOTOS.hisdhq,
  houston_city_council: PHOTOS.cityhall,
  "houston-council": PHOTOS.cityhall,
  commissioners_court: PHOTOS.courthouse,
  "harris-court": PHOTOS.courthouse,
  flood_control: PHOTOS.bayou,
  hcfcd: PHOTOS.bayou,
}

/** Generic photos for everything else, chosen so they never show another body's building. */
const BY_KIND: Record<string, BodyPhoto> = {
  school: PHOTOS.busstop,
  flood: PHOTOS.bayou,
  mud: PHOTOS.bayou,
}

export function bodyPhoto(bodyId: string, kind?: string): BodyPhoto {
  return BY_BODY[bodyId] ?? (kind ? BY_KIND[kind] : undefined) ?? PHOTOS.skyline
}

/** The wide photo behind the timeline's header. */
export const SKYLINE = PHOTOS.skyline
