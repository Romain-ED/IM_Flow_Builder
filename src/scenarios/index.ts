import singaporeAirlinesSource from './singapore-airlines.yaml?raw'
import ecommerceSource from './ecommerce.yaml?raw'
import restaurantSource from './restaurant.yaml?raw'
import beerlaoSource from './beerlao.yaml?raw'
import progadgetLaosSource from './progadget-laos.yaml?raw'

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
]

export const DEFAULT_SCENARIO = BUILT_IN_SCENARIOS[0]
