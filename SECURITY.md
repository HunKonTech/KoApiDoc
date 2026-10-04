# Security policy

## Reporting a vulnerability

Please report security problems **privately**, not in a public issue:

- GitHub: open the repository's **Security** tab and choose **Report a vulnerability** (private
  vulnerability reporting).

Include what is affected, how to reproduce it (a minimal specification or page setup helps), and
the impact you expect. Do not include real confidential specifications or personal data.

What to expect:

- We acknowledge the report within 7 days and keep you informed about the fix.
- We fix confirmed issues as fast as their severity requires and release the fix as a new app
  version; Forge updates installed sites automatically for changes that need no new permissions.
- We credit you in the release notes if you wish.

Problems in the Atlassian platform itself (Confluence, Forge) belong to Atlassian:
<https://www.atlassian.com/trust/security/report-a-vulnerability>. Problems in Swagger UI should
also be reported to that project.

## Supported versions

Only the latest version of KoApiDoc on the Atlassian Marketplace is supported. Security fixes are
not back-ported.

## How KoApiDoc limits risk

- **Read-only, minimal permissions.** Two read-only scopes, used to list and download attachments
  of the page that contains the macro. Requests run with the permissions of the person viewing the
  page (`requestConfluence`), so nobody sees an attachment they could not open in Confluence.
- **No egress, no backend storage.** The manifest declares no external hosts and no remote
  backend. The app stores nothing outside Confluence and uses no cookies or browser storage.
- **Untrusted specifications.** Specifications are treated as untrusted input:
  - Swagger UI sanitizes Markdown and HTML in descriptions (DOMPurify); script, `javascript:` links
    and frames are removed. KoApiDoc itself renders text only through React (no raw HTML).
  - `$ref`s to other files or URLs are never fetched; they are replaced by a placeholder, however
    deep in the document they are.
  - The 2 MB limit applies to every specification, pasted text as well as attachments. Documents
    with more than 2,000,000 values (JSON, or YAML that expands through aliases: "billion laughs")
    are rejected before anything walks them, so a page cannot freeze its readers' browsers. The
    configuration does not save pasted text that breaks these limits.
  - A Content Security Policy in the macro page, in addition to the CSP of the Forge platform,
    blocks remote images (tracking pixels), requests to other hosts, frames, form posts and
    plugins (`default-src 'self'`, `connect-src 'self'`, `frame-src 'none'`,
    `form-action 'none'`, `object-src 'none'`; see `static/macro-ui/vite.config.ts`).
  - "Try it out" and the "Authorize" dialog are disabled: no request is ever sent to the API
    described by a specification or to its authorization or token URLs.
- **Input checks.** Page and attachment IDs are validated before they become part of a REST path;
  pagination only follows links that stay on the same API once `..` segments are resolved.
  Attachments of other pages, blog posts or custom content are rejected; an attachment without an
  owner, or whose size Confluence does not report, is rejected. The 2 MB limit is checked from the
  metadata, from the `Content-Length` of the download and while reading it, so an oversized file
  is never read whole. Binary files are rejected after download.
- **Supply chain.** The production bundle is scanned for licenses and vulnerabilities before each
  release (`npm audit`, `npm run licenses`); the local mock used for tests is never part of the
  production build. See `docs/RELEASING.md` (private repository). The CI workflows pin every
  action to a full commit SHA; Dependabot proposes updates of those actions only.
