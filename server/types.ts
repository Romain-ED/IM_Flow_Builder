/** Shared server types. Flow definitions and webhook payloads are untrusted JSON, so those stay loosely typed. */

/** Untrusted or schema-less JSON (flow definitions, provider payloads). */
// oxlint-disable-next-line no-explicit-any
export type Json = any

export type LiveMode = 'disabled' | 'fake' | 'vonage'

export type Env = Record<string, string | undefined>

export interface LiveDemoConfig {
  mode: LiveMode
  configured: boolean
  errors: string[]
  recipient: string | null
  allowedFlowIds: string[]
  /** Flow ids from the build-generated always-on file; set by app.ts, never from the browser. */
  trustedAlwaysOnFlowIds?: string[]
  vonageJwt: string
  vonagePrivateKey: string
  vonageApplicationId: string
  vonageSignatureSecret: string
  rcsAgentId: string
  vonageApiUrl: string
  storagePath: string
  storageDurable: boolean
  demoEphemeralStorage: boolean
  alwaysOnFlowPath: string | null
  publicBaseUrl: string | null
}

/** The slice of config the Vonage mapping needs; `recipient` is the destination for this send. */
export type VonageSendConfig = Pick<
  LiveDemoConfig,
  'mode' | 'vonageJwt' | 'vonagePrivateKey' | 'vonageApplicationId' | 'vonageSignatureSecret' | 'rcsAgentId'
> & { recipient: string | null }

export type MediaHeight = 'short' | 'medium' | 'tall'

export interface LiveReply {
  id: string
  label: string
  kind?: string
  next?: string
  set?: Json
  startScenarioId?: string
}

export interface LiveAction {
  id: string
  label: string
  kind: string
  url?: string
  next?: string
  set?: Json
  startScenarioId?: string
}

export interface LiveCard {
  id: string
  title: string
  description?: string
  imageUrl?: string
  actions?: LiveAction[]
}

/** Provider-neutral outbound RCS content produced from a flow node. */
export interface LiveContent {
  id: string
  nodeId?: string
  type: string
  text?: string
  url?: string
  filename?: string
  title?: string
  description?: string
  thumbnailUrl?: string
  durationLabel?: string
  mediaHeight?: MediaHeight
  replies?: LiveReply[]
  actions?: LiveAction[]
  cards?: LiveCard[]
}

export type SessionStatus = 'starting' | 'awaiting_trigger' | 'awaiting_reply' | 'completed' | 'stopped'

export interface LiveOutbound {
  id: string
  providerMessageId: string
  nodeId: string
  content: LiveContent
  status: string
  at: string
}

export interface LiveTimelineItem {
  id: string
  ordinal: number
  at: string
  nodeId: string | null
  sender: string
  message: Json
}

export interface LiveActivityEntry {
  at: string
  nodeId: string | null
  preview: string
  kind: string
}

export interface LiveSession {
  id: string
  createdAt: string
  updatedAt: string
  status: SessionStatus
  recipient: string
  publicBaseUrl?: string | null
  flow: Json
  scenarioCatalog: Record<string, Json>
  variables: Record<string, Json>
  initialVariables?: Record<string, Json>
  currentNodeId: string | null
  pendingInput: Json
  correlation: Record<string, LiveReply | LiveAction>
  processedInbound: string[]
  outbound: LiveOutbound[]
  events: Json[]
  timeline: LiveTimelineItem[]
  nextTimelineOrdinal: number
  timelineTruncated: boolean
  activity: {
    latestInbound: LiveActivityEntry | null
    latestOutbound: LiveActivityEntry | null
    latestProvider: LiveActivityEntry | null
  }
  provider: { latestStatus: string | null; updatedAt: string | null }
}

export interface LiveSessionStore {
  list(): LiveSession[]
  get(id: string): LiveSession | null
  save(session: LiveSession): LiveSession
}

export interface GatewayResult {
  providerMessageId: string
  status: string
  content: LiveContent
}

export interface RcsGateway {
  send(content: LiveContent, recipient?: string | null): Promise<GatewayResult>
}
