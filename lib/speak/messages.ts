import en from "../../messages/en.json"
import es from "../../messages/es.json"

export type SpeakLanguage = "en" | "es"
export type SpeakMessages = typeof en.speak
const spanish: SpeakMessages = es.speak
export function speakMessages(language: SpeakLanguage): SpeakMessages {
  return language === "es" ? spanish : en.speak
}
export function formatSpeakTime(iso: string, language: SpeakLanguage) {
  if (!Number.isFinite(Date.parse(iso))) return "—"
  return new Intl.DateTimeFormat(language === "es" ? "es-US" : "en-US", {
    timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", timeZoneName: "short",
  }).format(new Date(iso))
}
