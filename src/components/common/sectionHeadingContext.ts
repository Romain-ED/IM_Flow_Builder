import { createContext } from 'react'

/**
 * When true, `SectionHeading` renders nothing. The sidebar wraps each control
 * group in a collapsible section that already shows the title, so the
 * control's own heading would be a duplicate.
 */
export const HideSectionHeadingContext = createContext(false)
