type Brand = 'rcs' | 'whatsapp' | 'apple' | 'android'

interface BrandIconProps {
  brand: Brand
  decorative?: boolean
  label?: string
}

export function BrandIcon({ brand, decorative = true, label }: BrandIconProps) {
  const a11y = decorative ? { 'aria-hidden': true } : { role: 'img' as const, 'aria-label': label ?? brand }
  if (brand === 'rcs') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" {...a11y} fill="currentColor">
        <path d="M4.2 4.5h15.6A2.2 2.2 0 0 1 22 6.7v8.1a2.2 2.2 0 0 1-2.2 2.2H11l-4.6 3.2.9-3.2H4.2A2.2 2.2 0 0 1 2 14.8V6.7a2.2 2.2 0 0 1 2.2-2.2Z" />
        <path d="M7 8.1h10v1.5H7zm0 3.1h7.5v1.5H7z" fill="white" />
      </svg>
    )
  }
  if (brand === 'whatsapp') {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" {...a11y} fill="currentColor">
        <path d="M12 2.1a9.8 9.8 0 0 0-8.4 14.8L2.1 21.9l5.2-1.4A9.8 9.8 0 1 0 12 2.1Zm0 17.8a8 8 0 0 1-4.1-1.1l-.3-.2-3.1.8.8-3-.2-.3A8 8 0 1 1 12 19.9Z" />
        <path d="M16.5 13.8c-.2-.1-1.3-.7-1.5-.8-.2-.1-.4-.1-.6.1l-.7.9c-.1.2-.3.2-.5.1a6.4 6.4 0 0 1-1.8-1.1 7.1 7.1 0 0 1-1.2-1.5c-.1-.2 0-.3.1-.5l.4-.5c.1-.2.1-.3 0-.5l-.7-1.6c-.1-.3-.4-.3-.6-.3h-.5c-.2 0-.5.1-.7.3-.2.2-.8.8-.8 1.9s.8 2.2.9 2.3c.1.2 1.6 2.5 3.9 3.5.5.2.9.4 1.2.5.5.2 1 .2 1.4.1.4-.1 1.3-.5 1.5-1 .2-.5.2-.9.1-1-.1-.1-.3-.2-.5-.3Z" fill="white" />
      </svg>
    )
  }

  if (brand === 'apple') {
    return (
      <svg viewBox="0 0 24 24" width="17" height="17" {...a11y} fill="currentColor">
        <path d="M16.7 12.8c0-2 1.6-3 1.7-3.1-.9-1.4-2.4-1.6-3-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.8-2.8-.8-1.4 0-2.7.8-3.4 2.1-1.5 2.6-.4 6.5 1.1 8.7.8 1.1 1.6 2.2 2.7 2.1 1.1 0 1.5-.7 2.8-.7 1.3 0 1.7.7 2.8.7 1.2 0 1.9-1.1 2.7-2.2.9-1.3 1.3-2.6 1.3-2.7-.1 0-2.7-1-2.7-3.3ZM14.6 6.7c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1 1.6-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" width="17" height="17" {...a11y} fill="currentColor">
      <path d="M7 8.5 5.8 6.4l.9-.5 1.2 2.1A7.2 7.2 0 0 1 12 6.9c1.5 0 2.9.4 4.1 1.1l1.2-2.1.9.5-1.2 2.6c1.3 1 2.1 2.5 2.1 4.2v5.1c0 .7-.5 1.2-1.2 1.2H6.1c-.7 0-1.2-.5-1.2-1.2v-5.1c0-1.7.8-3.2 2.1-4.2ZM8.5 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm7 0a1 1 0 1 0 0-2 1 1 0 0 0 0 2ZM8 20h8v1.2a.8.8 0 0 1-1.6 0V20h-4.8v1.2a.8.8 0 0 1-1.6 0V20Z" />
    </svg>
  )
}
