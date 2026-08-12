import { ExternalLink, Phone, MapPin, Calendar, Sparkles, ArrowRight, type LucideIcon } from 'lucide-react'
import type { Action } from '../schema/messages'

export const ACTION_ICONS: Record<Action['type'], LucideIcon> = {
  reply: ArrowRight,
  open_url: ExternalLink,
  call: Phone,
  location: MapPin,
  calendar: Calendar,
  custom: Sparkles,
}
