import type { SpeakProgress } from './progress.ts'

export function selectedChannel<T extends { id: string }>(methods: T[], channel: string | null): T | null {
  return methods.find(method => method.id === channel) ?? null
}

export function changeChannel(progress: SpeakProgress, channel: string | null): SpeakProgress {
  if (progress.channel === channel) return progress
  return { ...progress, channel, registrationStatus: 'not_started', checklist: progress.checklist.filter(id => id !== 'registration') }
}
