import singaporeAirlinesSource from './singapore-airlines.yaml?raw'
import ecommerceSource from './ecommerce.yaml?raw'
import restaurantSource from './restaurant.yaml?raw'
import beerlaoSource from './beerlao.yaml?raw'
import progadgetLaosSource from './progadget-laos.yaml?raw'
import ltcLaoTelecomSource from './ltc-lao-telecom.yaml?raw'
import dominosSingaporeRcsDemoSource from './dominos-singapore-rcs-demo.yaml?raw'
import vbankMultifinanceSource from './vbank-multifinance.yaml?raw'
import rcsDemoMenuSource from './rcs-demo-menu.yaml?raw'

export interface BuiltInScenario {
  id: string
  name: string
  description: string
  source: string
}

export const BUILT_IN_SCENARIOS: BuiltInScenario[] = [
  {
    id: 'singapore-airlines',
    name: 'Airline boarding pass',
    description: 'Check-in reminder → seat selection → digital boarding pass.',
    source: singaporeAirlinesSource,
  },
  {
    id: 'ecommerce',
    name: 'E-commerce delivery',
    description: 'Shipping notice → delivery preferences → confirmation.',
    source: ecommerceSource,
  },
  {
    id: 'restaurant',
    name: 'Restaurant reservation',
    description: 'Reservation reminder → table confirmation → pre-order.',
    source: restaurantSource,
  },
  {
    id: 'beerlao',
    name: 'Beerlao login & event promo',
    description: 'OTP login (retry on a wrong code) → event promotion with images.',
    source: beerlaoSource,
  },
  {
    id: 'progadget-laos',
    name: 'Pro Gadget Laos pre-order & launch',
    description: 'Phone-verified pre-order (OTP) → order/shipping updates → WhatsApp promo broadcast.',
    source: progadgetLaosSource,
  },
  {
    id: 'ltc-lao-telecom',
    name: 'Lao Telecom — Utility notifications',
    description: 'Data usage alert → prepaid balance warning → bill payment reminder.',
    source: ltcLaoTelecomSource,
  },
  {
    id: 'dominos-singapore-rcs-demo',
    name: "Domino's Pizza Singapore — RCS Messaging",
    description: 'Promotions → menu browsing → order builder → store finder → checkout, tracking, and customer care.',
    source: dominosSingaporeRcsDemoSource,
  },
  {
    id: 'vbank-multifinance-first-repayment',
    name: 'V Bank: From just curious to first repayment',
    description: 'Discovery → indicative eligibility → Personal Loan application → first repayment.',
    source: vbankMultifinanceSource,
  },
  {
    id: 'rcs-demo-menu',
    name: 'RCS Business Messaging Menu',
    description: 'Choose a built-in business messaging scenario to start.',
    source: rcsDemoMenuSource,
  },
]

/**
 * Built-in scenario ids that were removed. A browser that persisted one of these
 * (the last-loaded flow is stored as full source) falls back to the default scenario.
 */
export const REMOVED_SCENARIO_IDS: readonly string[] = ['dominos-rcs-video-campaign']

export const DEFAULT_SCENARIO = BUILT_IN_SCENARIOS[0]
