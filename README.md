# KoApiDoc

Confluence Cloud (Forge) macro that renders an OpenAPI / Swagger specification (JSON or YAML) with
Swagger UI. The spec is either pasted into the macro or read from a `.json` / `.yaml` / `.yml`
attachment of the page (always the latest version, max. 2 MB). Status: step 4 (prepared for the
Marketplace, not yet deployed), see [`docs/STATUS.md`](docs/STATUS.md) and the step documents
[`STEP-4`](docs/STEP-4.md), [`STEP-3`](docs/STEP-3.md), [`STEP-2`](docs/STEP-2.md),
[`STEP-1`](docs/STEP-1.md), [`PLAN`](docs/PLAN.md).

| For | Document |
| --- | -------- |
| Users | [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md), [`docs/PRIVACY.md`](docs/PRIVACY.md), [`CHANGELOG.md`](CHANGELOG.md) |
| Security reports | [`SECURITY.md`](SECURITY.md) |
| Marketplace submission | [`docs/MARKETPLACE-LISTING.md`](docs/MARKETPLACE-LISTING.md), [`marketing/`](marketing/README.md) |
| Releases | [`docs/RELEASING.md`](docs/RELEASING.md) |

## Display options

Set in the macro configuration, next to the source (stored as `options`; configs saved before step 3
have none and look as before):

| Option          | Values                                                          | Default   |
| --------------- | --------------------------------------------------------------- | --------- |
| Expand on load  | everything collapsed, tags open, everything open                | tags open |
| Schemas section | shown / hidden                                                  | shown     |
| Search box      | on / off (matches path, method, summary, operation ID, tag)     | on        |
| Tags to show    | any of the spec's tags (untagged operations: `default`), or all | all       |
| Height          | automatic, or fixed 200–5000 px with scrolling inside           | automatic |

The configuration has a live preview (**Show preview**) and suggests choosing tags for specs with
more than 1000 operations.

Known limitations (full list in the [user guide](docs/USER-GUIDE.md#limitations)): Confluence's
PDF / Word export and print do not run Custom UI apps, so the macro is missing from exports (a
static `adfExport` fallback is a candidate after step 5). The iframe height is managed by the Forge
host; the local mock imitates it, the real behaviour is checked in step 5.

## Development

Requirements: Node.js 22 or 24 (Forge CLI), npm, an Atlassian **development** Confluence site.

```bash
npm ci && npm ci --prefix static/macro-ui
npm run lint && npm run format:check && npm run typecheck && npm test
npm run build                  # builds static/macro-ui/dist
```

End-to-end and accessibility tests (Playwright, headless Chromium, axe-core) run against a
production build of the local mock, no Atlassian account needed:

```bash
npx playwright install chromium   # once
npm run test:e2e
```

Marketplace images (logo, banner, screenshots of the mock) are regenerated with
`npm run marketing:capture`, see [`marketing/README.md`](marketing/README.md).

Other helpers: `npm run fixtures:large` writes the generated large test specs (1500 operations,
just below and above 2 MB) to `tests/fixtures/` (git-ignored), `npm run licenses` prints the
license summary of the shipped dependencies (see `THIRD_PARTY_NOTICES`).

## Local preview (no Atlassian account needed)

```bash
npm run dev:local
```

Opens `http://localhost:5173/local.html`: the macro UI with `@forge/bridge` replaced by a local mock
(`static/macro-ui/dev/bridge-mock.ts`, only active in `--mode mock`, never in the production build).
Switch between view and config mode, sample specs (Petstore JSON/YAML, external `$ref`, Bookshop
3.1 with tags, a circular YAML anchor that is rejected, remote images and script links
that must be blocked, invalid, empty, saved from config), page attachments and light/dark theme. The second bar overrides the display options
(expand, schemas, search box, tags, height); "(saved)" keeps the saved ones. **Size frame to
content** imitates the Forge host, which sizes the macro frame to its content. Saving in config mode
stores the config in the browser's localStorage.

Attachment mode: the mock emulates the Confluence REST endpoints (`requestConfluence`) for a page
with eight attachments (JSON, YAML, OpenAPI 3.1, one with external `$ref`s, generated large specs
with 1500 operations / just below 2 MB / above 2 MB, and one PNG that is hidden from the list). The **Failure** switch (`?fail=` on `index.html`) simulates `forbidden`, `missing`,
`toolarge`, `notext` and `slow` (20 s, ends in the 15 s timeout message). In config mode choose
**Page attachment** to see the list, pick a file and save; the view then loads it.

Not covered locally: the real Forge Content Security Policy, the real macro context and the real
Confluence attachment API (scopes, download redirect, permissions). Those need a
deploy to a development Confluence site, which is not part of the current workflow:

```bash
npx forge login && npx forge register && npx forge deploy && npx forge install
```
