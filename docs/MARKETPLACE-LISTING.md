# Marketplace listing: KoApiDoc for Confluence

Everything the Marketplace submission asks for, in one place. Field limits are from
[Building your presence on Marketplace](https://developer.atlassian.com/platform/marketplace/building-your-presence-on-marketplace/)
and the [brand guidelines](https://developer.atlassian.com/platform/marketplace/atlassian-brand-guidelines-for-marketplace-vendors/)
(checked 2 October 2026; check again before submitting, the forms change). The character counts in
brackets were measured on the texts below.

## 1. Decisions

Status on 2 October 2026. "Proposed" means: this is what the repository uses now; it stays unless
the owner decides otherwise before step 6.

| # | Question | Decision | Status | Consequence if changed |
| --- | --- | --- | --- | --- |
| D1 | Listing name | **KoApiDoc for Confluence** (follows "App for Product"; no "app", "plugin", "Atlassian" in it; title case) | proposed | update the banner (`marketing/banner.svg`) and this file |
| D2 | Partner (vendor) name | **HunKonTech**, legal holder Koncsik Benedek (as in `LICENSE`). If HunKonTech cannot act as an organisation, the partner profile is created in the owner's own name. | **open: owner** | banner text "by HunKonTech", `PRIVACY.md`, `LICENSE` |
| D3 | EULA | the repository's own [`LICENSE`](../LICENSE) (free use, no modification), after legal review. Atlassian's standard customisable EULA does not contain the "no modification" term. | proposed, legal review open | EULA URL in the listing |
| D4 | Public URLs (privacy policy, user guide, EULA) | GitHub file links on `main` (table below). **The repository is private today**: these links only work after it is made public (planned since the start, see `PLAN.md`). Alternative: GitHub Pages from the repository root (for a private repository this needs a paid GitHub plan). | **open: owner** (make the repo public, or choose Pages) | links in this file, in the listing and in `USER-GUIDE.md` |
| D5 | Support channel | GitHub Issues (bugs, ideas); security reports through GitHub private vulnerability reporting (`SECURITY.md`). No e-mail address is published for now; one can be added to `SECURITY.md` and the listing later. | proposed | `SECURITY.md`, issue templates |
| D6 | Atlassian Developer Community contact | at least one contact must be registered there; the owner registers with their Atlassian account | **open: owner** | none in the repository |
| D7 | Dependabot | manual updates (see `RELEASING.md`); the close-external-PRs workflow already lets `dependabot[bot]` through, so enabling it later needs only the repository setting | done | none |
| D8 | Pricing | free | proposed | paid would need `app.licensing` in the manifest and a different EULA |
| D9 | "Try it out" | not in the first release (needs egress, loses "Runs on Atlassian") | decided in step 3 | listing texts |

Public URLs (valid once D4 is resolved):

| Use | URL |
| --- | --- |
| Documentation (user guide) | <https://github.com/HunKonTech/KoApiDoc/blob/main/docs/USER-GUIDE.md> |
| Privacy policy | <https://github.com/HunKonTech/KoApiDoc/blob/main/docs/PRIVACY.md> |
| EULA | <https://github.com/HunKonTech/KoApiDoc/blob/main/LICENSE> |
| Issue tracker (support) | <https://github.com/HunKonTech/KoApiDoc/issues> |
| Security reports | <https://github.com/HunKonTech/KoApiDoc/security/advisories/new> |
| Source code | <https://github.com/HunKonTech/KoApiDoc> |

## 2. Listing texts

### App name (max. 60) [23]

```text
KoApiDoc for Confluence
```

### Tagline (max. 130) [98]

```text
Show OpenAPI and Swagger API documentation on Confluence pages, from an attachment or pasted text.
```

### Summary (max. 250) [201]

```text
KoApiDoc renders Swagger 2.0, OpenAPI 3.0 and 3.1 specifications as a read-only, searchable API reference on Confluence pages. Paste the spec into the macro or attach the JSON or YAML file to the page.
```

### More details (max. 1000) [976]

```text
Keep your API reference where your team already reads documentation. Add the KoApiDoc macro to a page, choose a .json, .yaml or .yml attachment of that page, or paste the specification, and readers get a browsable reference with operations, parameters, request bodies, responses, examples and schemas.

When the attachment gets a new version, the page shows it the next time it is opened. Editors choose what readers see: expansion on load, tags to show, the schemas section, a search box and an automatic or fixed height, with a live preview.

Designed to be safe and light: KoApiDoc only reads attachments of the current page with the permissions of the viewer, has no external network access, stores nothing outside Confluence and collects no data. It follows the Confluence light and dark theme.

Not included: sending requests to the API ("Try it out"), references to external files, PDF export of the macro. Works with Swagger 2.0, OpenAPI 3.0 and 3.1, files up to 2 MB.
```

### Highlights (3; title max. 50, summary max. 220; screenshot 1840 x 900)

**Highlight 1**: screenshot `marketing/screenshots/01-view-light.png`; title [37], summary [185]

```text
Your API reference, right on the page
```

```text
Operations, parameters, request bodies, responses and schemas, grouped by tag and readable without leaving Confluence. Supports Swagger 2.0, OpenAPI 3.0 and OpenAPI 3.1 in JSON or YAML.
```

**Highlight 2**: screenshot `marketing/screenshots/05-configuration.png`; title [37], summary [184]

```text
Always the latest version of the spec
```

```text
Point the macro at a .json or .yaml attachment of the page. Upload a new version of the file and the page shows it, no editing needed. Or simply paste the specification into the macro.
```

**Highlight 3**: screenshot `marketing/screenshots/04-search.png`; title [20], summary [199]

```text
Built for large APIs
```

```text
Search by path, method, summary, operation ID or tag, show only the tags your readers need, and choose a fixed height for long specifications. Clear messages explain what is wrong with a broken spec.
```

Highlight captions (max. 220), if the form asks for them separately: use the highlight summaries.

### Additional screenshots

| File | Caption |
| --- | --- |
| `02-view-dark.png` | Follows the Confluence dark theme. |
| `03-operation-details.png` | Expanded operation with request body example. |
| `06-configuration-preview.png` | Live preview of the display options while configuring. |
| `07-external-ref-warning.png` | References to external files are listed instead of failing silently. |
| `08-error-message.png` | Readable messages, for example when the viewer cannot open the attachment. |

### Logo and banner

| Asset | File | Size (Atlassian requirement) |
| --- | --- | --- |
| App logo | `marketing/icon-144.png` (source `icon.svg`) | 144 x 144 PNG |
| Banner, high resolution | `marketing/banner-1120x548.png` (source `banner.svg`) | 1120 x 548 PNG |
| Banner, standard | `marketing/banner-560x274.png` | 560 x 274 PNG |

The banner shows the app name, the partner name and what the app does, as required. Neither image
uses Atlassian, Confluence, Swagger or OpenAPI logos, fonts or brand colours.

### Categories and keywords

Categories (choose from the form's list; proposal): **Documentation**, **Developer tools**.

Keywords: `openapi`, `swagger`, `api documentation`, `rest api`, `api reference`, `yaml`, `json`,
`macro`.

### Release (version 0.1.0)

Release summary (max. 80) [52]:

```text
First release: OpenAPI and Swagger viewer for pages.
```

Release notes (max. 1000): the "0.1.0" section of [`CHANGELOG.md`](../CHANGELOG.md).

### Trademark and partner statement

For the documentation (already at the end of `USER-GUIDE.md`) and the partner website. It does
not fit into "More details" (976 of 1000 characters used) [249]:

```text
Atlassian and Confluence are trademarks of Atlassian Pty Ltd. OpenAPI is a trademark of The Linux Foundation. Swagger is a trademark of SmartBear Software. KoApiDoc is an independent product and is not affiliated with, endorsed or sponsored by them.
```

After the partner profile exists, the brand guidelines ask partners to identify themselves as "a
partner in the Atlassian Marketplace" on their own pages; do not claim more (no "official", no
rankings).

## 3. Privacy and security tab

Answers for the "Privacy and Security" tab of the listing (the questions are asked in the partner
portal; wording below is for copying, adjust to the exact questions).

| Topic | Answer |
| --- | --- |
| Does the app store data outside Atlassian? | No. The app has no remote backend and no external hosts in its manifest. |
| Does the app use Forge storage? | No. The macro configuration is stored by Confluence as part of the page. |
| End-user data in scope for data residency | None stored by the app. |
| Personal data processed | The app does not collect personal data. Attachments are read in the viewer's browser with the viewer's permissions and are not kept. Specifications written by customers may contain names or e-mail addresses (for example `info.contact`); they are only displayed. |
| Data shared with third parties | None. |
| Analytics, tracking, cookies | None. |
| Logging | No application logs with customer data. The resolver function contains no logic and is not called. |
| Data retention and deletion | Nothing to retain; on uninstall nothing remains with the partner. |
| Encryption | Not applicable (no storage); transport is handled by Atlassian. |
| DPA | Likely not needed, because the app does not process personal data on the partner's side. Confirm with the form: if Atlassian classifies displaying attachment content as processing, use Atlassian's DPA template. |
| "Runs on Atlassian" | Expected to qualify: Forge only, no egress, no remote. Confirm with the eligibility check in the developer console. |
| Security contact | GitHub private vulnerability reporting (see URLs above). |

### Scopes and why they are needed

| Scope | Used for | Endpoints |
| --- | --- | --- |
| `read:attachment:confluence` | List the attachments of the page that contains the macro, so the editor can choose a `.json` / `.yaml` / `.yml` file; read an attachment's metadata (name, media type, size, page) before downloading, to reject binary files, files above 2 MB and files of other pages. | `GET /wiki/api/v2/pages/{id}/attachments`, `GET /wiki/api/v2/attachments/{id}` |
| `readonly:content.attachment:confluence` | Download the content of the chosen attachment to display it. | `GET /wiki/rest/api/content/{pageId}/child/attachment/{id}/download` |

Both scopes are read-only. All calls are made with `requestConfluence` from the browser, i.e. as the
user viewing the page, so the app never shows an attachment the user could not open in Confluence.
The exact scope names are checked with `forge lint` in step 5.

### External hosts

None. The manifest has no `permissions.external` section and no `remotes`. Remote images in
specifications are blocked by the app's Content Security Policy.

## 4. Known limitations (to state honestly)

- No "Try it out" (no requests to the documented API).
- External `$ref`s (other files, URLs) are shown as placeholders.
- Remote images in descriptions are not shown.
- Attachments up to 2 MB; attachments of the same page only.
- PDF / Word export and printing do not include the macro.
- Confluence Cloud only (no Data Center version).

## 5. Atlassian-side to-do list (steps 5 and 6)

Nothing below has been done; none of it can be done from the repository.

**Step 5: first check on a development site (owner's approval needed)**

1. Atlassian account and free development site (`go.atlassian.com/cloud-dev`).
2. `npx forge login`, `npx forge register` (replaces the placeholder `app.id` in `manifest.yml`).
3. `npm run forge:lint`: confirm the scope names; add `FORGE_EMAIL` / `FORGE_API_TOKEN` secrets so CI
   runs it too.
4. `npx forge deploy -e development`, `npx forge install` on the development site.
5. Check list: attachment list and download on real Confluence, the Forge CSP together with the
   app's own CSP meta tag, Swagger UI styles under the Forge CSP, macro configuration size limit,
   edit and view mode, iframe height (automatic and fixed), dark theme with Confluence tokens,
   PDF export behaviour, a viewer without access to the attachment.
6. Optional, after the check: decide about a static export fallback (`adfExport` in the macro
   module renders a short text such as the API title and version in PDF / Word exports).
7. Real screenshots if wanted (the mock screenshots are allowed; real ones could show the macro
   in a page).

**Step 6: submission**

1. Resolve the open decisions D2, D4, D6 and the legal review of `LICENSE` and `PRIVACY.md`.
2. Make the repository public (or set up Pages) and check that every URL in section 1 opens without
   login. Enable private vulnerability reporting in the repository settings.
3. Create the Marketplace partner profile (accepts the Marketplace Partner Agreement).
4. Enable sharing for the app and publish the developer space in the developer console.
5. `npx forge deploy -e production`.
6. Create the listing: texts from section 2, images from `marketing/`, privacy and security answers
   and scopes from section 3, EULA, privacy policy and documentation URLs, support contact, pricing:
   free.
7. Submit for approval (Atlassian aims for a decision within about a week to 15 business days) and
   answer the reviewers' questions.
8. After approval: tag the release, update `CHANGELOG.md` with the date, announce.
