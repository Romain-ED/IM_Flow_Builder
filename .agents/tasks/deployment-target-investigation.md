# Deployment Target Investigation

## Summary answer

The documented deployment target is **Vonage Cloud Runtime (VCR)**, specifically the `im-flow-builder` project’s `prod` instance in `aws.apse1`, using Vonage application ID `0ba99fd4-3f1f-45f9-b8a3-8a76ecf9ebe2`. The repository’s deployment command is:

```bash
npm run deploy
```

For a local preflight without publishing, run `npm run build` first, then run `npm run deploy` only when ready to publish. `npm run deploy` invokes `vcr deploy`; it publishes the current working tree to VCR and does **not** push a Git branch. The repository does not document how the VCR CLI itself is authenticated, so the target and command are unambiguous, but a successful deployment cannot be guaranteed without an already authenticated/configured VCR CLI and the required VCR-side secrets.

## Evidence

- **`README.md` — “Deployment (Vonage Cloud Runtime)”** identifies VCR as the primary deployment target, names the dedicated `im-flow-builder` Vonage application, and states that production assets are served through `server/index.js`.
- **`README.md` — deployment command block** documents `npm run build`, `npm start`, and `npm run deploy`, with `npm run deploy` described as building and deploying with the VCR CLI.
- **`package.json` — `scripts.deploy`** maps the repository command directly to `vcr deploy`:
  ```json
  "deploy": "vcr deploy"
  ```
- **`vcr.yml` — `project` and `instance`** selects:
  - project name: `im-flow-builder`
  - instance name: `prod`
  - runtime: `nodejs22`
  - region: `aws.apse1`
  - application ID: `0ba99fd4-3f1f-45f9-b8a3-8a76ecf9ebe2`
  - build script: `./build.sh`
  - entrypoint: `node server/index.js`
  - public access: `security.access: public`
- **`build.sh`** installs development dependencies with `npm install --include=dev --ignore-scripts` and then runs `npm run build`. This produces the Vite `dist/` output used by the VCR runtime.
- **`README.md` — deployment behavior** says VCR starts the Node server with the injected `VCR_PORT`, checks `GET /_/health`, and then routes traffic to the application.
- **`server/index.js` — startup configuration** binds to `VCR_PORT` when present, otherwise `PORT` or `3000`, and starts `server/app.js`; this matches the VCR entrypoint and port injection described in the README.
- **`.vcrignore`** excludes local dependencies, environment files, Git/editor metadata, repository automation, the VCR manifest itself, and local Live RCS session data. It specifically prevents `.live-rcs-sessions.json` from being uploaded as runtime state.
- **`docs/LIVE_RCS_DEMO.md` — “VCR environment configuration”** requires Live RCS configuration to be stored as encrypted VCR environment variables and explicitly says not to put credentials in `.env`, the repository, scenarios, localStorage, or browser bundles.
- **Current repository state** (`git -C /Users/romain/scripts/IM_Flow_Builder status --short --branch`) shows branch `claude/messaging-flow-simulator-wboec4`, one commit ahead of its origin tracking branch, with the Android UI files modified locally: `src/components/phone/ActionButton.tsx`, `src/components/phone/ChoiceChips.tsx`, `src/messages/Carousel.tsx`, and `src/messages/RichCard.tsx`. No deployment was run.

## Commands

Safe local validation before publishing:

```bash
cd /Users/romain/scripts/IM_Flow_Builder
npm run build
```

This only type-checks and creates the local production build; it does not publish externally.

Documented deployment command:

```bash
cd /Users/romain/scripts/IM_Flow_Builder
npm run deploy
```

This invokes `vcr deploy`, which uses `vcr.yml` and its `build-script` to build and deploy the application to the VCR `im-flow-builder` / `prod` target. Do not substitute `git push`: deployment is performed by the VCR CLI, not by a branch push or GitHub workflow.

## Credentials and environment variables

### VCR CLI authentication

The repository does not contain documentation or configuration for authenticating the `vcr` CLI. Before running `npm run deploy`, the operator must have the VCR CLI installed and authenticated according to the organization’s VCR setup. The exact login command, profile, token variable, and required account permissions are not specified in the checked-in files and could not be verified without external VCR account documentation.

### Runtime environment

`vcr.yml` maps these encrypted VCR secrets into the deployed runtime:

- `LIVE_RCS_MODE`
- `LIVE_RCS_TEST_RECIPIENT`
- `LIVE_RCS_OPERATOR_TOKEN`
- `LIVE_RCS_ALLOWED_FLOW_IDS`
- `LIVE_RCS_VONAGE_APPLICATION_ID`
- `LIVE_RCS_RCS_AGENT_ID`
- `LIVE_RCS_VONAGE_PRIVATE_KEY`
- `LIVE_RCS_VONAGE_SIGNATURE_SECRET`
- `LIVE_RCS_DEMO_EPHEMERAL_STORAGE`

`docs/LIVE_RCS_DEMO.md` and `server/liveDemo.js` define their behavior:

- `LIVE_RCS_MODE` should be `disabled` (or omitted) for the normal simulator, `fake` for a protected development exercise, or `vonage` for provider delivery.
- When Live RCS is enabled, `LIVE_RCS_TEST_RECIPIENT`, `LIVE_RCS_OPERATOR_TOKEN`, and `LIVE_RCS_ALLOWED_FLOW_IDS` are required.
- In `vonage` mode, `LIVE_RCS_RCS_AGENT_ID`, `LIVE_RCS_VONAGE_APPLICATION_ID`, and `LIVE_RCS_VONAGE_SIGNATURE_SECRET` are required, plus either `LIVE_RCS_VONAGE_PRIVATE_KEY` or `LIVE_RCS_VONAGE_JWT`.
- In `vonage` mode, either `LIVE_RCS_STORAGE_DURABLE=true` or the explicitly limited `LIVE_RCS_DEMO_EPHEMERAL_STORAGE=true` is required.
- `LIVE_RCS_STORE_PATH` is recommended for a durable VCR volume; `LIVE_RCS_STORAGE_DURABLE` is required for production durable storage.
- `LIVE_RCS_VONAGE_API_URL` is optional and defaults in `server/liveDemo.js` to `https://api-eu.vonage.com/v1/messages`.

### Configuration gap

The operations document lists `LIVE_RCS_STORE_PATH` and `LIVE_RCS_STORAGE_DURABLE` as important storage settings, and lists `LIVE_RCS_VONAGE_JWT` as an optional credential and `LIVE_RCS_VONAGE_API_URL` as an optional endpoint override. Those variables are not mapped in the checked-in `vcr.yml` (which maps the private-key path and ephemeral-storage flag instead). This does not block deploying the UI with Live RCS disabled, but it should be corrected before enabling production Vonage delivery; otherwise the required durable-storage settings may not reach the runtime.

The Live RCS documentation also requires public HTTPS webhook callbacks after the VCR domain is known:

- `POST https://<vcr-domain>/webhooks/vonage/inbound`
- `POST https://<vcr-domain>/webhooks/vonage/status`

Those callbacks and Vonage application configuration are operational prerequisites for a real `vonage`-mode session, not prerequisites for publishing the simulator UI itself.

## Conclusions and recommendations

1. **Hosting target:** unambiguous — deploy to VCR project `im-flow-builder`, instance `prod`, region `aws.apse1`, application ID `0ba99fd4-3f1f-45f9-b8a3-8a76ecf9ebe2`.
2. **External publication:** `npm run deploy` publishes externally through VCR. It does not push a Git branch. The command was not executed during this investigation.
3. **Proceeding without asking the user:** the repository gives enough information to select the deployment target and exact project command. Proceeding still depends on local VCR CLI authentication and account access, which are not documented here. If those are already configured, no target clarification is needed.
4. **Live RCS safety:** the Android UI change can be deployed with `LIVE_RCS_MODE=disabled`; do not enable real delivery merely as part of publishing the UI. If Live RCS is intended, verify the fixed recipient, allowlisted flow IDs, Vonage agent/application credentials, webhook registration, and durable storage first.
5. **Recommended repository fix:** update `vcr.yml` to map the documented production storage variables (`LIVE_RCS_STORE_PATH` and `LIVE_RCS_STORAGE_DURABLE`) and any intentionally supported JWT/API URL overrides, or update the operations document so the supported VCR configuration is explicit. Also document the organization-approved VCR CLI authentication/setup procedure outside or alongside the repository’s deployment section.
