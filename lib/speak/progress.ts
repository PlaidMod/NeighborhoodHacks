export type SpeakProgress = {
  version: 1;
  step: 0 | 1 | 2 | 3;
  registrationStatus: 'not_started' | 'registered' | 'confirmed';
  channel: string | null;
  draft: string;
  stance: 'support' | 'oppose' | 'change' | 'delay' | 'question' | null;
  experience: string;
  ask: string;
  reminderRequested: boolean;
  checklist: string[];
};

export const EMPTY_PROGRESS: SpeakProgress = {
  version: 1,
  step: 0,
  registrationStatus: 'not_started',
  channel: null,
  draft: '',
  stance: null,
  experience: '',
  ask: '',
  reminderRequested: false,
  checklist: [],
};
Object.freeze(EMPTY_PROGRESS.checklist);
Object.freeze(EMPTY_PROGRESS);

const fields = new Set(Object.keys(EMPTY_PROGRESS));

function boundedString(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length <= maximum;
}

function isProgress(value: unknown): value is SpeakProgress {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  if (Object.getPrototypeOf(value) !== Object.prototype) return false;
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  return keys.length === fields.size && keys.every((key) => fields.has(key)) &&
    record.version === 1 &&
    typeof record.step === 'number' && [0, 1, 2, 3].includes(record.step) &&
    ['not_started', 'registered', 'confirmed'].includes(record.registrationStatus as string) &&
    (record.channel === null || boundedString(record.channel, 100)) &&
    boundedString(record.draft, 2000) &&
    (record.stance === null || ['support', 'oppose', 'change', 'delay', 'question'].includes(record.stance as string)) &&
    boundedString(record.experience, 500) && boundedString(record.ask, 500) &&
    typeof record.reminderRequested === 'boolean' &&
    Array.isArray(record.checklist) && record.checklist.length <= 32 &&
    record.checklist.every((entry) => boundedString(entry, 100));
}

function emptyProgress(): SpeakProgress {
  return { ...EMPTY_PROGRESS, checklist: [] };
}

export function progressKey(itemId: string): string {
  return `showup:speak:v1:${encodeURIComponent(itemId)}`;
}

export function loadProgress(storage: Pick<Storage, 'getItem'> | null, itemId: string): SpeakProgress {
  try {
    const raw = storage?.getItem(progressKey(itemId));
    if (!raw) return emptyProgress();
    const parsed: unknown = JSON.parse(raw);
    return isProgress(parsed) ? parsed : emptyProgress();
  } catch {
    return emptyProgress();
  }
}

export function saveProgress(
  storage: Pick<Storage, 'setItem'> | null,
  itemId: string,
  progress: SpeakProgress,
): boolean {
  try {
    if (!storage || !isProgress(progress)) return false;
    storage.setItem(progressKey(itemId), JSON.stringify(progress));
    return true;
  } catch {
    return false;
  }
}

export function clearProgress(storage: Pick<Storage, 'removeItem'> | null, itemId: string): boolean {
  try {
    if (!storage) return false;
    storage.removeItem(progressKey(itemId));
    return true;
  } catch {
    return false;
  }
}
