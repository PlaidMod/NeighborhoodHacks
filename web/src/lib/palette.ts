export type PaletteKey = "red" | "white" | "blue" | "ink"
export type PaletteColors = Record<PaletteKey, string>
export const PALETTE_VARS: Record<PaletteKey, string> = { red: "--brick", white: "--surface", blue: "--denim", ink: "--ink" }
export const PALETTE_KEYS = Object.keys(PALETTE_VARS) as PaletteKey[]
export const DEFAULT_PALETTE: PaletteColors = { red: "#b23a48", white: "#faf7f2", blue: "#3d5a80", ink: "#1b263b" }
export const PALETTE_PRESETS = [
  { name: "Americana", note: "Warm paper, faded blue", colors: DEFAULT_PALETTE },
  { name: "Old Glory", note: "Crisp, classic contrast", colors: { red: "#b22234", white: "#ffffff", blue: "#3c3b6e", ink: "#24243b" } },
  { name: "Bayou", note: "Teal, clay, limestone", colors: { red: "#a84732", white: "#f6f1e7", blue: "#2f5d62", ink: "#203b3c" } },
  { name: "Space City", note: "Navy, burnt orange", colors: { red: "#b94e12", white: "#f8f5ef", blue: "#173d68", ink: "#17283b" } },
  { name: "Newsprint", note: "Ink, paper, editorial red", colors: { red: "#b12d3d", white: "#f4f1ea", blue: "#353535", ink: "#242424" } },
  { name: "Field notes", note: "Forest, rust, soft ivory", colors: { red: "#a34c3c", white: "#f5f5ee", blue: "#3e5e48", ink: "#26372c" } },
] satisfies { name: string; note: string; colors: PaletteColors }[]
export const PALETTE_STORE = "showup.dev.palette"
export const PALETTE_FLAG = "showup.dev"
export function isHex(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
}
/** Validate browser data and migrate the original three-token picker. */
export function parsePalette(raw: string | null): PaletteColors {
  try {
    const saved: unknown = JSON.parse(raw ?? "null")
    if (!saved || typeof saved !== "object" || Array.isArray(saved)) return { ...DEFAULT_PALETTE }
    const result = { ...DEFAULT_PALETTE }
    for (const key of PALETTE_KEYS) {
      const value = (saved as Record<string, unknown>)[key]
      if (isHex(value)) result[key] = value.toLowerCase()
    }
    return result
  } catch { return { ...DEFAULT_PALETTE } }
}
export function paletteCSS(colors: PaletteColors) {
  return `:root {\n${PALETTE_KEYS.map((key) => `  ${PALETTE_VARS[key]}: ${colors[key]};`).join("\n")}\n}`
}
export function contrastRatio(a: string, b: string) {
  function luminance(hex: string) {
    const rgb = [1, 3, 5].map((offset) => {
      const channel = parseInt(hex.slice(offset, offset + 2), 16) / 255
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
    })
    return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722
  }
  const l1 = luminance(a), l2 = luminance(b)
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
}
