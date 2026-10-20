import { describe, expect, it } from "vitest"
import { factCheck } from "@/lib/stories/factCheck"
import { writeStories, type JsonGenerator } from "@/lib/stories/generate"
import { buildStoryPrompt } from "@/lib/stories/prompt"
import { templateStory } from "@/lib/stories/template"
import { StorySchema, type Story } from "@/lib/stories/types"
import { ALL_FIXTURES, countyTaxRate, hisdConsolidation, hisdPersonnel, mudBond } from "./fixtures"

const goodMudStory: Story = {
  headline: "MUD 489 to vote Oct. 28 on ordering a $38.5 million bond election",
  dek: "The board meets Wednesday, Oct. 28 at 11 a.m., according to the agenda.",
  body_paragraphs: [
    "The agenda lists item 7: ordering an election on $38.5 million in unlimited tax bonds for water, sewer and drainage.",
    "In the district's last election, on Nov. 5, 37 of 5,116 registered voters cast a ballot (0.7%).",
    "Residents can sign up at the meeting or send a written comment before 11 a.m. on Oct. 28.",
  ],
  renter_line: "Bond debt is repaid through property taxes, which landlords pay, so renters can comment too.",
}

const goodHisdStoryEs: Story = {
  headline: "La junta de HISD votará el 22 de octubre sobre consolidar 9 escuelas",
  dek: "La reunión es el jueves 22 de octubre a las 5 p. m., según la agenda.",
  body_paragraphs: [
    "La agenda incluye aprobar la consolidación de 9 escuelas con baja inscripción a partir del año escolar 2027-2028.",
    "La inscripción para hablar cierra el miércoles 21 de octubre a las 12 p. m. Cada persona tiene 2 minutos.",
  ],
  renter_line: "Los inquilinos con hijos en estas escuelas también pueden comentar.",
}

describe("fact-check: correct stories pass", () => {
  it("English MUD bond story", () => {
    expect(factCheck(goodMudStory, mudBond, "en")).toEqual([])
  })
  it("Spanish HISD story", () => {
    expect(factCheck(goodHisdStoryEs, hisdConsolidation, "es")).toEqual([])
  })
  it("tax rate story with the rate and 'per $100'", () => {
    const s: Story = {
      headline: "Commissioners Court to vote Oct. 29 on a $0.3950 tax rate",
      dek: "The proposed rate is above the no-new-revenue rate of $0.3891 per $100, according to the agenda.",
      body_paragraphs: [
        "The court meets Thursday, Oct. 29 at 10 a.m. The agenda lists a 2026 tax rate of $0.3950 per $100 of value.",
        "Online sign-up to speak closes Oct. 28 at 5 p.m. Speakers get 3 minutes.",
      ],
      renter_line: "Property taxes are part of what landlords pay, so renters can comment too.",
    }
    expect(factCheck(s, countyTaxRate, "en")).toEqual([])
  })
})

describe("fact-check: deliberately wrong stories are rejected", () => {
  const swap = (s: Story, from: string, to: string): Story => ({
    ...s,
    headline: s.headline.replace(from, to),
    dek: s.dek.replace(from, to),
    body_paragraphs: s.body_paragraphs.map((p) => p.replace(from, to)),
  })

  it("wrong amount", () => {
    expect(factCheck(swap(goodMudStory, "$38.5 million", "$40 million"), mudBond, "en").join()).toMatch(/amount/)
  })
  it("wrong date", () => {
    expect(factCheck(swap(goodMudStory, "Oct. 28", "Oct. 30"), mudBond, "en").join()).toMatch(/date/)
  })
  it("wrong time", () => {
    expect(factCheck(swap(goodMudStory, "11 a.m.", "6 p.m."), mudBond, "en").join()).toMatch(/time/)
  })
  it("an invented number", () => {
    const s = { ...goodMudStory, renter_line: "About 4,000 households would pay for the bonds." }
    expect(factCheck(s, mudBond, "en").join()).toMatch(/number not in facts: 4,000/)
  })
  it("an invented percentage", () => {
    const s = { ...goodMudStory, dek: "Turnout was just 12% last time, the agenda says." }
    expect(factCheck(s, mudBond, "en").join()).toMatch(/percent/)
  })
  it("a loaded word in the headline", () => {
    const s = { ...goodMudStory, headline: "MUD 489 to vote on controversial bond election Oct. 28" }
    expect(factCheck(s, mudBond, "en").join()).toMatch(/loaded word/)
  })
  it("a wrong Spanish date", () => {
    expect(factCheck(swap(goodHisdStoryEs, "22 de octubre", "23 de octubre"), hisdConsolidation, "es").join()).toMatch(
      /date/,
    )
  })
  it("a loaded Spanish word", () => {
    const s = { ...goodHisdStoryEs, headline: "Polémica: HISD votará el 22 de octubre sobre 9 escuelas" }
    expect(factCheck(s, hisdConsolidation, "es").join()).toMatch(/loaded word/)
  })
})

describe("template stories", () => {
  for (const f of ALL_FIXTURES) {
    for (const lang of ["en", "es"] as const) {
      it(`${f.item_id} (${lang}) is valid and passes the fact-check`, () => {
        const s = templateStory(f, lang)
        expect(StorySchema.safeParse(s).success).toBe(true)
        expect(factCheck(s, f, lang)).toEqual([])
      })
    }
  }

  it("personnel items never name anyone and say the outcome isn't posted", () => {
    const s = templateStory(hisdPersonnel, "en")
    expect(s.headline).toMatch(/outcome not posted yet/)
    expect(JSON.stringify(s)).toMatch(/An employee/)
  })
})

describe("writeStories", () => {
  const goodEsForMud: Story = {
    headline: "MUD 489 votará el 28 de octubre sobre una elección de bonos de $38.5 millones",
    dek: "La junta se reúne el miércoles 28 de octubre a las 11 a. m., según la agenda.",
    body_paragraphs: [
      "La agenda incluye ordenar una elección de bonos por $38.5 millones para agua, drenaje y alcantarillado.",
      "Se puede comentar en la reunión o por escrito antes de las 11 a. m. del 28 de octubre.",
    ],
    renter_line: "Los inquilinos también pueden comentar.",
  }

  it("uses the AI story when both languages pass", async () => {
    const gen: JsonGenerator = async ({ lang }) => (lang === "en" ? goodMudStory : goodEsForMud)
    const r = await writeStories(mudBond, gen)
    expect(r.story_source).toBe("ai")
    expect(r.story_en.headline).toBe(goodMudStory.headline)
  })

  it("regenerates once after a failed check", async () => {
    let calls = 0
    const gen: JsonGenerator = async ({ lang }) => {
      calls++
      if (lang === "en" && calls === 1) return { ...goodMudStory, headline: "MUD 489 to vote Oct. 28 on $99 million bonds" }
      return lang === "en" ? goodMudStory : goodEsForMud
    }
    const r = await writeStories(mudBond, gen)
    expect(r.story_source).toBe("ai")
    expect(r.problems.join()).toMatch(/attempt 1/)
  })

  it("falls back to the template after two failures", async () => {
    const gen: JsonGenerator = async () => ({ ...goodMudStory, headline: "MUD 489 to vote Oct. 31 on bonds today" })
    const r = await writeStories(mudBond, gen)
    expect(r.story_source).toBe("template")
    expect(r.story_es.headline).toMatch(/MUD 489/)
  })

  it("falls back when the model errors or returns bad JSON", async () => {
    const r1 = await writeStories(mudBond, async () => {
      throw new Error("timeout")
    })
    const r2 = await writeStories(mudBond, async () => "{not json")
    expect(r1.story_source).toBe("template")
    expect(r2.story_source).toBe("template")
  })

  it("uses the template when no model is configured", async () => {
    expect((await writeStories(mudBond)).story_source).toBe("template")
  })
})

describe("prompt", () => {
  it("gives the model pre-formatted values and the private-person flag", () => {
    const { system, prompt } = buildStoryPrompt(hisdPersonnel, "en")
    expect(system).toMatch(/an employee/)
    expect(prompt).toMatch(/"contains_private_person": true/)
    expect(buildStoryPrompt(mudBond, "es").prompt).toMatch(/\$38\.5 millones/)
  })
})
