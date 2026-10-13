import { z } from 'zod'

export const phonePlatformSchema = z.enum(['ios', 'android'])
export type PhonePlatform = z.infer<typeof phonePlatformSchema>

export const DEFAULT_PHONE_PLATFORM: PhonePlatform = 'ios'
