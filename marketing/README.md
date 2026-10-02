# Marketing assets

Images for the Atlassian Marketplace listing and the user guide. All of them are generated from
this repository with one command (no Atlassian site, no image editor):

```bash
npx playwright install chromium   # once
npm run marketing:capture
```

`capture.mts` renders the SVG sources to PNG and takes the screenshots from the local mock (a
production build in `--mode mock`, the same setup as the e2e tests). Commit the regenerated PNGs.

| File | Used for | Size (Atlassian requirement) |
| --- | --- | --- |
| `icon.svg` → `icon-144.png` | app logo | 144 x 144 PNG, "chiclet" style |
| `banner.svg` → `banner-1120x548.png` | banner, high resolution | 1120 x 548 PNG |
| `banner.svg` → `banner-560x274.png` | banner, standard | 560 x 274 PNG |
| `screenshots/01-view-light.png` | highlight 1, user guide | 1840 x 900 PNG |
| `screenshots/02-view-dark.png` | additional screenshot | 1840 x 900 PNG |
| `screenshots/03-operation-details.png` | additional screenshot, user guide | 1840 x 900 PNG |
| `screenshots/04-search.png` | highlight 3, user guide | 1840 x 900 PNG |
| `screenshots/05-configuration.png` | highlight 2, user guide | 1840 x 900 PNG |
| `screenshots/06-configuration-preview.png` | additional screenshot, user guide | 1840 x 900 PNG |
| `screenshots/07-external-ref-warning.png` | additional screenshot, user guide | 1840 x 900 PNG |
| `screenshots/08-error-message.png` | additional screenshot, user guide | 1840 x 900 PNG |

Requirements (from
[Building your presence on Marketplace](https://developer.atlassian.com/platform/marketplace/building-your-presence-on-marketplace/),
checked 2 October 2026; check again before submitting):

- Logo 144 x 144 PNG/JPG with a transparent or bounded ("chiclet") background.
- Banner 1120 x 548 (or 560 x 274) PNG/JPG with the app name, the partner name and a short
  description of what the app does.
- Three highlight screenshots 1840 x 900 (or 920 x 450) PNG/JPG; the form also asks for a 580 x 330
  crop of each, which is chosen in the form.

Brand rules: no Atlassian logos, product names, fonts, illustrations or brand colours in the logo;
no Swagger (SmartBear) or OpenAPI logos either. The artwork here is drawn from scratch (a document
with JSON braces) in navy and amber.

The screenshots show the macro only, as it appears inside a Confluence page, with the sample
specifications of `tests/fixtures`. The banner text "by HunKonTech" follows decision D2 in
[`docs/MARKETPLACE-LISTING.md`](../docs/MARKETPLACE-LISTING.md); change `banner.svg` and regenerate
if the partner name changes.
