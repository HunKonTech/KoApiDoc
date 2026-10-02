# KoApiDoc

Confluence Cloud (Forge) macro that renders an OpenAPI / Swagger specification (JSON or YAML) with
Swagger UI. The spec is either pasted into the macro or read from a `.json` / `.yaml` / `.yml`
attachment of the page (always the latest version, max. 2 MB). Status: step 2, see
[`docs/STEP-2.md`](docs/STEP-2.md), [`docs/STEP-1.md`](docs/STEP-1.md) and [`docs/PLAN.md`](docs/PLAN.md).

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
Switch between view and config mode, sample specs (Petstore JSON/YAML, external `$ref`, invalid,
empty, saved from config), page attachments and light/dark theme. Saving in config mode stores the
config in the browser's localStorage.

Attachment mode: the mock emulates the Confluence REST endpoints (`requestConfluence`) for a page
with five attachments (JSON, YAML, OpenAPI 3.1, one with external `$ref`s, one PNG that is hidden
from the list). The **Failure** switch (`?fail=` on `index.html`) simulates `forbidden`, `missing`,
`toolarge`, `notext` and `slow` (20 s, ends in the 15 s timeout message). In config mode choose
**Page attachment** to see the list, pick a file and save; the view then loads it.

Not covered locally: the real Forge Content Security Policy, the real macro context and the real
Confluence attachment API (scopes, download redirect, permissions). Those need a
deploy to a development Confluence site, which is not part of the current workflow:

```bash
npx forge login && npx forge register && npx forge deploy && npx forge install
```
