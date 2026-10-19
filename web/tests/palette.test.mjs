import assert from "node:assert/strict"
import { test } from "node:test"
import { contrastRatio, parsePalette, paletteCSS, DEFAULT_PALETTE, PALETTE_PRESETS } from "../src/lib/palette.ts"

test("corrupt or unsafe saved colors fall back without reaching CSS", () => {
  assert.deepEqual(parsePalette("not json"), DEFAULT_PALETTE)
  assert.deepEqual(parsePalette('null'), DEFAULT_PALETTE)
  assert.deepEqual(parsePalette('{"blue":"url(https://example.com)","red":5}'), DEFAULT_PALETTE)
})

test("legacy three-color palettes gain the default ink", () => {
  const legacy = { red: "#a12345", white: "#ffffff", blue: "#123456" }
  assert.deepEqual(parsePalette(JSON.stringify(legacy)), { ...legacy, ink: DEFAULT_PALETTE.ink })
})

test("contrast uses WCAG luminance rather than color distance", () => {
  assert.equal(contrastRatio("#000000", "#ffffff"), 21)
  assert.equal(contrastRatio("#888888", "#888888"), 1)
  assert.ok(contrastRatio("#ffffff", "#eb6e1f") < 4.5)
})

test("export contains a complete root block including the chosen ink", () => {
  const css = paletteCSS({ ...DEFAULT_PALETTE, ink: "#123456" })
  assert.match(css, /^:root \{/)
  assert.match(css, /--ink: #123456;/)
  assert.match(css, /--surface:/)
  assert.match(css, /\}$/)
})

test("preset primary buttons and body text pass small-text contrast", () => {
  for (const { name, colors } of PALETTE_PRESETS) {
    assert.ok(contrastRatio(colors.blue, "#ffffff") >= 4.5, `${name}: primary`)
    assert.ok(contrastRatio(colors.ink, colors.white) >= 4.5, `${name}: body`)
  }
})
