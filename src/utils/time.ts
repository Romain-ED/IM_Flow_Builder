export function formatTime(timestamp: number, locale = 'en-US'): string {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(
      new Date(timestamp),
    )
  } catch {
    return new Date(timestamp).toLocaleTimeString()
  }
}
