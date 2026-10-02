# Releasing KoApiDoc

How a version gets from `main` to the Atlassian Marketplace. Steps marked **(confirm)** come from
Atlassian's documentation as of October 2026 and have not been run for this app yet; confirm them
against the live documentation the first time (steps 5 and 6 of the project plan).

References: [Forge app versions](https://developer.atlassian.com/platform/forge/versions/),
[forge deploy](https://developer.atlassian.com/platform/forge/cli-reference/deploy/),
[Listing Forge apps](https://developer.atlassian.com/platform/marketplace/listing-forge-apps/),
[Upgrading and versioning cloud apps](https://developer.atlassian.com/platform/marketplace/upgrading-and-versioning-cloud-apps/).

## Version numbers

KoApiDoc uses semantic versioning in `package.json`, `static/macro-ui/package.json` and
`CHANGELOG.md` (all three carry the same number):

| Change | Version | Example |
| --- | --- | --- |
| Bug fix, no visible change of behaviour | patch | 0.1.0 → 0.1.1 |
| New option or feature, old macro configurations still work | minor | 0.1.1 → 0.2.0 |
| Old configurations need changes, or a feature is removed | major | 0.2.0 → 1.0.0 |

Forge has its own version numbers, created by `forge deploy`. A Forge **major** version is created
when the app needs new permissions (scopes, external hosts, ...); site administrators must then
approve the update before their sites get it. Every other deploy is a Forge **minor** version that
installed sites receive automatically. Changing `permissions` in `manifest.yml` is therefore a
deliberate decision: avoid it in fixes.

Macro configurations saved by an older version must keep working (`parseMacroConfig` accepts every
earlier shape; the unit tests cover them). Never remove a field reader without a migration.

## Before a release (local, no Atlassian)

1. `main` is green in CI (lint, format, typecheck, unit tests, build, e2e).
2. Update the version numbers and move the `CHANGELOG.md` entries from "unreleased" to the new
   version with today's date.
3. Fresh install and full check:

   ```bash
   npm ci && npm ci --prefix static/macro-ui
   npm run lint && npm run format:check && npm run typecheck && npm test
   npm run build && npm run test:e2e
   ```

4. The production bundle contains no mock code:

   ```bash
   grep -rlE "bridge-mock|koapidoc-local-config" static/macro-ui/dist && echo "MOCK IN BUILD" || echo ok
   ```

5. Vulnerabilities: `npm audit --omit=dev --prefix static/macro-ui` (what is shipped) must have no
   high or critical finding. Workflows: `zizmor .github` must have no medium or
   higher finding (every action pinned to a commit SHA, no persisted credentials) except
   `dangerous-triggers` on `close-external-prs.yml`, which checks out no code and only closes the
   pull request (accepted in the security audit). `npm audit` of the root (development tools, mainly `@forge/cli`) is
   recorded in the release notes of the step; see "Known audit exceptions" below.
6. Licenses: `npm run licenses`; check that no GPL, LGPL or AGPL package is in the bundle and update
   `THIRD_PARTY_NOTICES` (the step 4 procedure, from the build's source maps, is in
   [`STEP-4.md`](STEP-4.md)).
7. If the UI changed visibly: `npm run marketing:capture` and check the screenshots, then update the
   user guide if needed.
8. If the listing texts, the permissions or the data handling changed: update
   [`MARKETPLACE-LISTING.md`](MARKETPLACE-LISTING.md) and [`PRIVACY.md`](PRIVACY.md).
9. Tag the release commit: `git tag v0.1.0 && git push origin v0.1.0`.

## Deploying (Atlassian)

1. `npx forge login` (an API token of the account that owns the app).
2. `npm run forge:lint` must be clean.
3. Development first **(confirm)**:

   ```bash
   npx forge deploy -e development
   npx forge install --upgrade -e development   # on the development site
   ```

   Check on the development site: a pasted spec, an attachment spec, an updated attachment
   version, the dark theme, edit and view mode, a page viewed by a user without access to the
   attachment.

4. Production **(confirm)**:

   ```bash
   npx forge deploy -e production
   ```

   If the deploy creates a Forge major version (new permissions), the CLI warns and asks for
   approval (`forge deploy --approve ...`); stop and check whether this is intended.

5. Marketplace **(confirm)**: for an app already listed, Marketplace detects a production deploy
   and creates the new version itself within a few minutes. Add the release summary (max. 80
   characters) and release notes (max. 1000 characters) from `CHANGELOG.md` to that version in
   the partner portal. The first listing is created by hand (see `MARKETPLACE-LISTING.md`).

6. Afterwards: check one production installation (a free site) and watch the issue tracker.

## Rolling back

Forge does not roll a site back to an older version by itself. To undo a bad release, revert the
commit on `main`, raise the patch version and deploy again (same steps). If the bad version added
permissions, the fix must not remove them in a hurry: that would be another major version.

## Dependency updates

npm dependencies are updated by hand before each release and at least monthly (`npm outdated`,
`npm audit`, both packages); Dependabot security updates are off. Dependabot only proposes updates
of the GitHub Actions, monthly (`.github/dependabot.yml`): the workflows pin each action to a
commit SHA, and the pull request updates the SHA and its version comment. Check the action's
release notes before merging. The workflow that closes external pull requests lets Dependabot's
pull requests through.

Swagger UI updates need extra care: the search plugin, the dark mode and the display options
depend on its internals. After an update run the e2e tests and look at the screenshots.

## Known audit exceptions

Last checked: 2 October 2026 (security audit, finding KOA-10; see
[`security/SECURITY-AUDIT-2026-10-02.md`](security/SECURITY-AUDIT-2026-10-02.md)).

| Package | Where | Why it is accepted |
| --- | --- | --- |
| 31 advisories (2 critical, 14 high) in transitive dependencies of `@forge/cli` 14.1.0 (e.g. `shell-quote`, `websocket-driver`, `adm-zip`, `ws`, `lodash`) | root `devDependencies`, development tool only | `@forge/cli` pins them in its own `npm-shrinkwrap.json`, so `npm audit fix` cannot update them; only Atlassian can. They are never part of the shipped bundle (`npm audit --omit=dev` is clean in both packages). Re-check at every release and update `@forge/cli` when a new version is out. |
