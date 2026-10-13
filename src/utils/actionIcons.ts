import { ExternalLink, Phone, MapPin, Calendar, Sparkles, ArrowRight, type LucideIcon } from 'lucide-react'
import type { Action } from '../schema/messages'

export const ACTION_ICONS: Record<Action['type'], LucideIcon> = {
  reply: ArrowRight,
  open_url: ExternalLink,
  call: Phone,
  location: MapPin,
  calendar: Calendar,
  custom: Sparkles,
  display_only: Sparkles,
}

/** Resolve authored action types while keeping malformed runtime data renderable. */
export function getActionIcon(type: Action['type'] | string | null | undefined): LucideIcon {
  return (type ? ACTION_ICONS[type as Action['type']] : undefined) ?? ArrowRight
}
