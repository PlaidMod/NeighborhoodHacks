import { describe, expect, it } from "vitest"
import type { Classifier, Item } from "@/lib/adapters/types"
import { classify, type ClassifyBody, type ClassifyItem } from "@/lib/rules/classify"
import { RULE_TEXT } from "@/lib/rules/ruleText"

const county: ClassifyBody = { id: "commissioners_court", sms_eligible: true, type: "commissioners_court" }
const hisd: ClassifyBody = { id: "hisd_board", sms_eligible: true, type: "school_board" }
const mud: ClassifyBody = { id: "hcmud_489", sms_eligible: true, type: "mud" }
const lsc: ClassifyBody = { id: "lone_star_board", sms_eligible: true, type: "college_board" }
const metro: ClassifyBody = { id: "metro", sms_eligible: false, type: "metro" }

const item = (title: string, extra: Partial<ClassifyItem> = {}): ClassifyItem => ({
  title,
  status: "upcoming",
  amounts: [],
  contains_private_person: false,
  ...extra,
})

const rate = (value: number) => ({ value, text: value.toFixed(4), kind: "rate" as const })
const money = (value: number, text: string) => ({ value, text, kind: "money" as const })

describe("classify: every rule fires on its sample", () => {
  it("tax_rate_increase: proposed rate above the no-new-revenue rate", () => {
    const r = classify(
      item("Consider and adopt the 2026 tax rate of $0.3950 per $100 valuation", { amounts: [rate(0.395)] }),
      county,
      { no_new_revenue_rate: 0.3891, voter_approval_rate: 0.4012 },
    )
    expect(r).toEqual({ item_type: "tax", tier: "sms", rule_fired: "tax_rate_increase" })
  })

  it("bond: MUD orders a bond election", () => {
    const r = classify(
      item("Order an election for the issuance of $38,500,000 unlimited tax bonds for water, sewer and drainage", {
        amounts: [money(38_500_000, "$38,500,000")],
      }),
      mud,
    )
    expect(r).toEqual({ item_type: "bond", tier: "sms", rule_fired: "bond" })
  })

  it("bond: authorizing the sale of a bond series", () => {
    expect(classify(item("Authorize the sale of Series 2026 Unlimited Tax Bonds"), mud).rule_fired).toBe("bond")
  })

  it("board_election: ordering a directors election", () => {
    const r = classify(item("Order the November 3, 2026 directors election and appoint election officials"), mud)
    expect(r).toEqual({ item_type: "election", tier: "sms", rule_fired: "board_election" })
  })

  it("school_change: campus consolidation", () => {
    const r = classify(item("Approve the consolidation of Pugh Elementary School into Burnet Elementary School"), hisd)
    expect(r).toEqual({ item_type: "school", tier: "sms", rule_fired: "school_change" })
  })

  it("school_change: attendance boundary change", () => {
    expect(classify(item("Approve attendance boundary changes for the 2027-2028 school year"), hisd).rule_fired).toBe(
      "school_change",
    )
  })

  it("leader_hire: superintendent employment contract", () => {
    const r = classify(item("Approve the employment contract for the Superintendent of Schools"), hisd)
    expect(r).toEqual({ item_type: "leader", tier: "sms", rule_fired: "leader_hire" })
  })

  it("leader_hire: naming a chancellor finalist", () => {
    expect(classify(item("Name the lone finalist for Chancellor"), lsc).rule_fired).toBe("leader_hire")
  })

  it("meeting_moved: a texting rule on a meeting whose date changed", () => {
    const r = classify(
      item("Order an election for the issuance of $38,500,000 unlimited tax bonds"),
      mud,
      null,
      { date: "2026-10-28T11:00:00-05:00", previous_date: "2026-10-21T11:00:00-05:00" },
    )
    expect(r).toEqual({ item_type: "bond", tier: "sms", rule_fired: "meeting_moved" })
  })
})

describe("classify: near-misses that must not text", () => {
  it("a vendor contract with a performance bond", () => {
    const r = classify(item("Approve contract with ABC Paving for road repairs, including a performance bond"), county)
    expect(r.tier).not.toBe("sms")
    expect(r.rule_fired).toBeUndefined()
  })

  it("a tax rate at exactly the no-new-revenue rate", () => {
    const r = classify(
      item("Consider and adopt the 2026 tax rate of $0.3891 per $100 valuation", { amounts: [rate(0.3891)] }),
      county,
      { no_new_revenue_rate: 0.3891 },
    )
    expect(r).toEqual({ item_type: "tax", tier: "weekly" })
  })

  it("a tax rate item with no no-new-revenue rate loaded can't be checked, so it doesn't text", () => {
    const r = classify(item("Adopt the 2026 tax rate", { amounts: [rate(0.5)] }), county, null)
    expect(r.tier).toBe("weekly")
  })

  it("a METRO item that matches a rule stays weekly", () => {
    const r = classify(item("Authorize the sale of METRO sales tax revenue bonds, Series 2026"), metro)
    expect(r).toEqual({ item_type: "bond", tier: "weekly", rule_fired: "bond" })
  })

  it("a contract with a superintendent search firm is not a leader hire", () => {
    const r = classify(item("Approve a contract with a superintendent search firm"), hisd)
    expect(r.rule_fired).toBeUndefined()
  })

  it("a bare 'contract' with the superintendent's office is not a leader hire", () => {
    expect(classify(item("Approve office supply contract for the Superintendent's office"), hisd).rule_fired).toBeUndefined()
  })

  it("canvassing election results is not a board election", () => {
    expect(classify(item("Canvass the results of the November directors election"), mud).rule_fired).toBeUndefined()
  })

  it("a school closure for weather is not a school change at a non-school body", () => {
    expect(classify(item("Ratify closure of county offices for weather"), county).rule_fired).toBeUndefined()
  })

  it("decided items never text", () => {
    const r = classify(
      item("Approve the employment contract for the Superintendent", { status: "decided" }),
      hisd,
    )
    expect(r).toEqual({ item_type: "leader", tier: "weekly", rule_fired: "leader_hire" })
  })

  it("awaiting_result items never text", () => {
    expect(classify(item("Order a bond election", { status: "awaiting_result" }), mud).tier).toBe("weekly")
  })
})

describe("classify: personnel and closed session (scraper spec §5.3)", () => {
  it("a redacted personnel hearing never texts, even if it mentions the superintendent", () => {
    const r = classify(
      item("An employee, Consideration of the superintendent's recommendation of termination", {
        contains_private_person: true,
        matter_type: "Hearing",
      }),
      hisd,
    )
    expect(r).toEqual({ item_type: "personnel", tier: "timeline" })
  })

  it("closed-session items never text", () => {
    const r = classify(
      item("Deliberate the duties of the superintendent and consider the employment contract", { section: "Closed Session" }),
      hisd,
    )
    expect(r.tier).not.toBe("sms")
    expect(r.item_type).toBe("personnel")
  })
})

describe("classify: weekly and timeline types", () => {
  it("budget items go weekly", () => {
    expect(classify(item("Adopt the FY2027 budget"), county)).toEqual({ item_type: "budget", tier: "weekly" })
  })
  it("water rate changes go weekly", () => {
    expect(classify(item("Amend the water and sewer rate order"), mud)).toEqual({ item_type: "water_rate", tier: "weekly" })
  })
  it("routine items go to the timeline", () => {
    expect(classify(item("Approve minutes of the previous meeting"), mud)).toEqual({ item_type: "other", tier: "timeline" })
  })
})

describe("contract with P2 (scraper spec §5.3)", () => {
  it("classify is a drop-in Classifier for ingest and reads P2's Item", () => {
    const asClassifier: Classifier = classify
    const p2Item: Item = {
      external_id: "e1",
      meeting_external_id: "m1",
      body_id: "hcmud_489",
      title: "Order an election for the issuance of $38,500,000 unlimited tax bonds",
      status: "upcoming",
      amounts: [{ value: 38_500_000, text: "$38,500,000" }],
      attachments: [],
      contains_private_person: false,
      source_url: "https://example.org/agenda.pdf",
    }
    expect(asClassifier(p2Item, mud, null)).toEqual({ item_type: "bond", tier: "sms", rule_fired: "bond" })
  })

  it("reads the no-new-revenue rate from an untyped tax_rates row, including numeric strings", () => {
    const r = classify(item("Adopt the 2026 tax rate", { amounts: [rate(0.395)] }), county, { no_new_revenue_rate: "0.3891" })
    expect(r.rule_fired).toBe("tax_rate_increase")
    expect(classify(item("Adopt the 2026 tax rate", { amounts: [rate(0.395)] }), county, "garbage").tier).toBe("weekly")
  })
})

describe("rule text", () => {
  it("every rule has English and Spanish text", () => {
    for (const [key, t] of Object.entries(RULE_TEXT)) {
      expect(t.en.title, key).toBeTruthy()
      expect(t.es.why, key).toBeTruthy()
    }
  })
})
