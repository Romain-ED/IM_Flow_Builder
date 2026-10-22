# RCS fidelity fix

- Trailing RCS `suggested_replies`/`suggested_actions` are consumed on selection. The content message remains, the user response is appended, and only the selected row is removed; a following node can render a new row. WhatsApp attachment behavior and card-owned actions are unchanged.
- RCS carousel cards now use fluid phone-width sizing (up to 418px) and a responsive medium ratio (1.82:1 by default), rather than a global 296x112px box. `mediaHeight` supports short/medium/tall density choices; `object-cover` retains centered cropping. This matches the 3:2 Domino’s assets more closely without a scenario-specific override.
