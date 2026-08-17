const URL_PATTERN = /(https?:\/\/[^\s]+)/g

/**
 * Very small, safe **bold** / _italic_ + auto-linked-URL renderer — no HTML
 * injection, no markdown library. Shared by every message component that
 * renders prose (body/description-style text), not just TextMessage —
 * titles, headers, footers, and button/chip labels stay plain, matching
 * real WhatsApp/RCS short-label fields that don't carry rich formatting.
 */
export function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, lineIndex) => {
        const parts = line.split(URL_PATTERN)
        return (
          <span key={lineIndex} className="block">
            {parts.map((part, i) =>
              URL_PATTERN.test(part) ? (
                <a
                  key={i}
                  href={part}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 break-all"
                  onClick={(e) => e.preventDefault()}
                >
                  {part}
                </a>
              ) : (
                <InlineFormatting key={i} text={part} />
              ),
            )}
            {line === '' && ' '}
          </span>
        )
      })}
    </>
  )
}

function InlineFormatting({ text }: { text: string }) {
  const tokens = text.split(/(\*\*[^*]+\*\*|_[^_]+_)/g).filter(Boolean)
  return (
    <>
      {tokens.map((token, i) => {
        if (token.startsWith('**') && token.endsWith('**')) {
          return <strong key={i}>{token.slice(2, -2)}</strong>
        }
        if (token.startsWith('_') && token.endsWith('_')) {
          return <em key={i}>{token.slice(1, -1)}</em>
        }
        return <span key={i}>{token}</span>
      })}
    </>
  )
}
