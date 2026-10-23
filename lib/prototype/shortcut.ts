/** The search shortcut as this device shows it: ⌘K on Apple devices, Ctrl K everywhere else. */
export function searchShortcutLabel(platform: string): string {
  return /mac|iphone|ipad|ipod/i.test(platform) ? '⌘K' : 'Ctrl K'
}
