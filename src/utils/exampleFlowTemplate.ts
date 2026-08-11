export const EXAMPLE_FLOW_TEMPLATE = `# Minimal documented example — see the Manual page or README for the full schema reference.
version: "1.0"
metadata:
  id: minimal-example
  name: "Minimal example"
  channel: generic
brand:
  name: "Example Business"
  verified: true
variables:
  customerName: Alex
start: welcome
nodes:
  - id: welcome
    messages:
      - type: text
        text: "Hi {{customerName}}, how can we help?"
    actions:
      - label: "Say hello"
        next: hello
  - id: hello
    messages:
      - type: text
        text: "Hello there!"
    end: true
`
