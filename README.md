# KoApiDoc

Confluence Cloud (Forge) macro that renders an OpenAPI / Swagger specification (JSON or YAML) with
Swagger UI. Status: step 1, see [`docs/STEP-1.md`](docs/STEP-1.md) and [`docs/PLAN.md`](docs/PLAN.md).

## Development

Requirements: Node.js 22 or 24 (Forge CLI), npm, an Atlassian **development** Confluence site.

```bash
npm ci && npm ci --prefix static/macro-ui
npm run lint && npm run typecheck && npm test
npm run build                  # builds static/macro-ui/dist
```

## Local preview (no Atlassian account needed)

```bash
npm run dev:local
```

Opens `http://localhost:5173/local.html`: the macro UI with `@forge/bridge` replaced by a local mock
(`static/macro-ui/dev/bridge-mock.ts`, only active in `--mode mock`, never in the production build).
Switch between view and config mode, sample specs (Petstore JSON/YAML, invalid, empty, saved from
config) and light/dark theme. Saving in config mode stores the spec in the browser's localStorage.

Not covered locally: the real Forge Content Security Policy and the real macro context. Those need a
deploy to a development Confluence site, which is not part of the current workflow:

```bash
npx forge login && npx forge register && npx forge deploy && npx forge install
```
