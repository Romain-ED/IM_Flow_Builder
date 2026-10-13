# RCS for Business specification reference

Canonical local reference for RCS scenario authoring and validation in this repository. The limits below are for **Google RCS for Business**, not WhatsApp. They describe the Google RBM API and Google Messages rich-card guidance, not every carrier or device's visual behavior.

**Official documentation checked:** 2026-10-13. Content was rephrased for compliance with licensing restrictions.

## Authoritative sources

- [AgentMessage and AgentContentMessage REST reference](https://developers.google.com/business-communications/rcs-business-messaging/reference/rest/v1/phones.agentMessages)
- [Rich cards and carousels](https://developers.google.com/business-communications/rcs-business-messaging/guides/learn/rich-cards)
- [Send messages](https://developers.google.com/business-communications/rcs-business-messaging/guides/build/messages/send)
- [RCS for Business best practices](https://developers.google.com/business-communications/rcs-business-messaging/guides/learn/best-practices)

## Limits used by this repository

| RCS content or field | Official rule | Enforcement here |
| --- | --- | --- |
| Text | Maximum 3,072 characters. | `rcsCapabilities.maxTextLength`; RCS normalizer and Live RCS preflight reject longer text. |
| Standalone suggestions | A content message may have at most 11 suggestion chips. This applies to suggested replies and suggested actions in the chip list. | `maxSuggestedReplies` and `maxSuggestedActions` are both 11; trailing suggestion validation and Live RCS preflight use these values. |
| Suggestion label | Maximum 25 characters for a chip label. | Capability warning and Live RCS preflight check `maxButtonLabelLength`. |
| Rich-card suggestions | A standalone rich card may contain at most 4 suggested replies/actions. | `maxRichCardSuggestions` is 4; normalizer, capability warning, and Live RCS preflight use it. |
| Carousel card suggestions | Each carousel card may contain at most 4 suggestions. | `maxCarouselCardButtons` is 4 and is checked per card. |
| Carousel cards | A carousel contains 2–10 cards. A single item is a standalone rich card, not a carousel. | RCS normalizer, capability warning, and Live RCS preflight enforce both bounds. |
| Rich-card/card title | Maximum 200 characters. | Capability warning and Live RCS preflight check titles. |
| Rich-card/card description | Maximum 2,000 characters. | Capability warning and Live RCS preflight check descriptions. |
| Rich-card payload | Maximum 250 KB. | The YAML schema has no serialized-payload byte field; media/payload byte size remains a provider/upload concern and is documented rather than guessed locally. |
| Media URL | `fileUrl` must be publicly reachable and its HTTP `Content-Type` must accurately identify the file. Redirects are not supported. | Live RCS preflight requires HTTPS (or localhost for development), resolves app-relative URLs, and checks known extensions. HTTPS is an application security policy in addition to Google's public-URL requirement. |
| Media size | Google documents a recommended maximum file size of 100 MB. A thumbnail, when used, is at most 100 KB. | This schema has no local file/thumbnail upload fields, so byte-size validation is not possible here. |
| Rich-card media formats | Images: JPEG/JPG, GIF, PNG. Video: H.263, M4V, MP4, MPEG/MPEG-4, WebM. PDF is supported for rich-card/file content only in India on the Google Messages client. | Live preflight checks image/video/PDF extensions. It cannot inspect remote `Content-Type` or bytes. |
| Media height | Vertical rich-card media: Short 112 DP, Medium 168 DP, Tall 264 DP. | `mediaHeight` maps to these choices in the authoring schema/renderers. |
| Suggestions and message ownership | Suggestions belong to the associated content message and are visible while that message is the latest conversation message. Supported content is text, file/media, or rich card; subsequent messages replace the chip list. | RCS normalization/preflight attach suggestions only to the immediately preceding business content message and reject floating suggestions. |
| Postback data | Suggested-reply postback data is limited to 2,048 characters. | The simulator generates short stable IDs; there is no authored postback-data field to validate. |

## Message types represented by the schema

- **`text`**: native RCS text content, maximum 3,072 characters.
- **`image`, `video`, `document`**: mapped to RCS media/file content. Use public media URLs and supported formats. The repository's `document` examples use PDF; PDF availability is region/client-specific as noted above.
- **`rich_card`**: native standalone rich card. Media, title, and description are optional in Google's model, but at least one of those three content fields is required. This schema requires a title. Card-owned `actions` become up to 4 RCS suggestions. RCS has no separate rich-card `header` or `footer` field; those schema fields are WhatsApp-only and are not rendered as RCS content.
- **`carousel`**: native vertical rich-card carousel with 2–10 cards. Each card may have optional media, title, description, and up to 4 suggestions. Prefer the first card as the best or recommended choice, as Google's UX guidance recommends.
- **`suggested_replies` and `suggested_actions`**: represented in the authoring model as a message immediately following content, then attached as an RCS suggestion list. A list below text/media may contain up to 11 mixed reply/action chips; suggestions inside a rich-card or carousel card are limited to 4. Native RCS suggested actions include dialing, opening a URL, viewing/sharing a location, and creating a calendar event; the current Live RCS provider adapter exposes only its `reply` and `open_url` mappings.
- **`location`**: not a native AgentContentMessage variant in Google's RBM API. Use a native suggested action such as view/share location instead; this repository therefore treats the top-level simulator `location` message as a fallback on RCS.
- **`list`**: no native RCS list/menu picker. It is a WhatsApp-only native type with an RCS fallback.
- **`input`**: no structured RCS input message. The simulator's input expectation is not sent as an RCS payload and is rejected by Live RCS preflight.
- **`system_action`**, `typing`, and `delay`: local simulator behavior, not agent content sent to a user. They are not RCS wire message types.
- **Simulator-only cards** (`flight_card`, `boarding_pass`, `otp`, `payment_request`, `calendar_event`, `product_catalog`, and `whatsapp_flow` where applicable): do not treat these as native RCS content. Use the fallback notes and the real primitives above when authoring an RCS flow.

## RCS versus WhatsApp

These are intentionally separate channel capabilities. Do not apply WhatsApp limits to an RCS flow:

| Capability | Google RCS for Business | WhatsApp in this app |
| --- | ---: | ---: |
| Suggestions below a content message | 11 mixed reply/action chips | 3 interactive buttons |
| Suggestions inside a rich card | 4 | 3 |
| Carousel cards | 2–10 | Up to 10 in the app's Carousel Template model |
| Suggestions per carousel card | 4 | 2 |
| Native list picker | No | 10 rows total |
| Suggestion label | 25 characters | 20 characters |

A flow with `metadata.channel: rcs` is hard-validated against RCS. A flow with `metadata.channel: whatsapp` is hard-validated against WhatsApp. A flow with no channel is required to fit both; previewing a channel-specific flow on the other channel may show a capability warning or fallback, but does not change the authored channel's validation rules.

## Authoring and UX guidance

Use one suggestion list for one coherent choice group and use the full applicable capacity when it improves the conversation: up to 4 card actions or up to 11 trailing chips. Do not merge unrelated choice groups just to reach a maximum, and do not create consecutive button/chip messages merely because an old implementation used a lower cap. If a single coherent group exceeds the official limit, continue it with a clearly labelled next page or another node. Do not repeat card-owned options in the chip list; Google specifically recommends using below-card suggestions to advance the conversation rather than duplicate card selections.

Keep suggestion labels concise even though the hard limit is 25 characters. Check target device capabilities, test media cropping, keep content focused, and respect user opt-outs. These are UX and operational recommendations, not additional RCS cardinality limits.
