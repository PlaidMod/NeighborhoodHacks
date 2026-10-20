import type { RuleKey } from "@/lib/rules/classify"

export type Lang = "en" | "es"

/** Time-based alerts come from the alerts job, not classify() (plan §8, §11). */
export type AlertRule = RuleKey | "registration_opens" | "registration_closes" | "protest_deadline"

/**
 * The published texting rules, in plain language. Used on the rules screen and on
 * the "Why did I get this text?" page (Project_Plan.md §8). Keep them at about an
 * 8th-grade reading level and never say whether the change is good or bad.
 */
export const RULE_TEXT: Record<AlertRule, Record<Lang, { title: string; why: string }>> = {
  tax_rate_increase: {
    en: {
      title: "A tax rate above the no-new-revenue rate",
      why: "This board is voting on a tax rate higher than the rate that would collect the same total tax as last year from the same properties.",
    },
    es: {
      title: "Una tasa de impuestos por encima de la tasa sin ingresos nuevos",
      why: "Esta junta va a votar sobre una tasa de impuestos más alta que la tasa que cobraría el mismo total de impuestos que el año pasado a las mismas propiedades.",
    },
  },
  bond: {
    en: {
      title: "A bond election or bond vote",
      why: "Bonds let a government borrow money that is paid back with taxes over many years. This item asks voters or the board to approve borrowing.",
    },
    es: {
      title: "Una elección o votación de bonos",
      why: "Los bonos permiten que un gobierno pida dinero prestado que se paga con impuestos durante muchos años. Este punto pide a los votantes o a la junta que aprueben un préstamo.",
    },
  },
  board_election: {
    en: {
      title: "An election for a seat on this board",
      why: "This board is setting up an election for one of its own seats. The text includes the registration deadline and early-voting dates.",
    },
    es: {
      title: "Una elección para un puesto en esta junta",
      why: "Esta junta está organizando una elección para uno de sus puestos. El mensaje incluye la fecha límite para registrarse y las fechas de votación anticipada.",
    },
  },
  school_change: {
    en: {
      title: "A school closure, merger or boundary change",
      why: "The school board is voting on closing or merging a campus, or changing which school a neighborhood is zoned to.",
    },
    es: {
      title: "Un cierre, fusión o cambio de límites escolares",
      why: "La junta escolar va a votar sobre cerrar o fusionar una escuela, o cambiar a qué escuela le corresponde un vecindario.",
    },
  },
  leader_hire: {
    en: {
      title: "Hiring, firing or contracting the superintendent or chancellor",
      why: "The board is voting on who leads the district or college, or on that leader's employment contract.",
    },
    es: {
      title: "Contratar, despedir o el contrato del superintendente o canciller",
      why: "La junta va a votar sobre quién dirige el distrito o el colegio, o sobre el contrato de trabajo de esa persona.",
    },
  },
  meeting_moved: {
    en: {
      title: "A meeting date change",
      why: "A meeting with one of the items above on its agenda moved to a new date.",
    },
    es: {
      title: "Un cambio de fecha de una reunión",
      why: "Una reunión que tiene en su agenda uno de los puntos de arriba cambió de fecha.",
    },
  },
  registration_opens: {
    en: {
      title: "Sign-up to speak opens today",
      why: "You asked for a reminder in Speak up. Registration to speak on this item opens today.",
    },
    es: {
      title: "Hoy se abre la inscripción para hablar",
      why: "Pediste un recordatorio en Speak up. La inscripción para hablar sobre este punto se abre hoy.",
    },
  },
  registration_closes: {
    en: {
      title: "Sign-up to speak closes within 24 hours",
      why: "You asked for a reminder in Speak up. Registration to speak on this item closes within 24 hours.",
    },
    es: {
      title: "La inscripción para hablar cierra en menos de 24 horas",
      why: "Pediste un recordatorio en Speak up. La inscripción para hablar sobre este punto cierra en menos de 24 horas.",
    },
  },
  protest_deadline: {
    en: {
      title: "Your property tax protest deadline is in 7 days",
      why: "You told us you own your home. This is the last week to protest your home's appraised value with HCAD.",
    },
    es: {
      title: "Tu fecha límite para protestar el avalúo es en 7 días",
      why: "Nos dijiste que eres dueño de tu casa. Esta es la última semana para protestar el valor de tasación de tu casa ante HCAD.",
    },
  },
}

/** The bodies that can send texts at all (Project_Plan.md §8). */
export const SMS_BODY_NOTE: Record<Lang, string> = {
  en: "Texts come only from City Council, Commissioners Court (including Flood Control items), school boards, community college boards, MUDs and ESDs. Port, METRO and regional water authority items appear in the weekly report only.",
  es: "Los mensajes de texto vienen solo del Concejo Municipal, la Corte de Comisionados (incluidos los puntos del Distrito de Control de Inundaciones), las juntas escolares, las juntas de colegios comunitarios, los MUD y los ESD. Los puntos del Puerto, METRO y las autoridades regionales de agua aparecen solo en el informe semanal.",
}
