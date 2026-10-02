# GitHub setup (owner only)

Settings that cannot be stored in the repository. Do them in the GitHub web UI as the repository owner.

## 1. About (repository front page, gear icon)

| Field | Value |
| --- | --- |
| Description | `Confluence Cloud (Forge) macro that renders OpenAPI and Swagger specs as a read-only API reference on pages.` |
| Website | `https://github.com/HunKonTech/KoApiDoc/blob/main/docs/USER-GUIDE.md` (replace with the Marketplace link after listing) |
| Topics | `confluence`, `confluence-cloud`, `atlassian-forge`, `forge-app`, `openapi`, `swagger`, `swagger-ui`, `api-documentation`, `typescript`, `react` |
| Include in the home page | Releases: off until the first release; Packages, Deployments: off |

Social preview (Settings > General): upload `marketing/banner-1120x548.png`.

## 2. Rulesets: only the owner can commit and create branches

The repository is public, so anyone can read and fork, but only people with write access can push. The goal: nobody else has write access, and even write-access holders (and Claude's PR branches) cannot touch `main` except through a pull request.

Settings > Rules > Rulesets > New ruleset > **New branch ruleset**.

### Ruleset A: "Protect main"

- Enforcement: **Evaluate** first, switch to **Active** after a week without surprises.
- Target branches: **Include default branch**.
- Bypass list: **Repository admin** (role: you). Mode: **For pull requests only**, so even an admin changes `main` only through a pull request (an admin can still merge a PR whose checks or approvals are missing). Nobody else. Hotfixes go through a PR as well.
- Rules to tick:
  - Restrict deletions
  - Block force pushes
  - Require linear history (optional; the repo uses merge commits, so leave it off)
  - Require a pull request before merging: required approvals **0** (you are the only reviewer; GitHub does not let you approve your own PR; raise it to 1 once there is a second maintainer), dismiss stale approvals on push, require conversation resolution
  - Require status checks to pass: add `build` and `e2e` (the jobs of `ci.yml`; they appear in the list after one CI run), **Require branches to be up to date** on

### Ruleset B: "Only owner creates branches"

- Enforcement: Evaluate first, then Active.
- Target branches: **Include all branches** (pattern `~ALL`), **exclude** `claude/**` if Claude Code sessions should keep working, and `dependabot/**` so that Dependabot can open its pull requests for the GitHub Actions (`.github/dependabot.yml`).
- Bypass list: **Repository admin** only.
- Rules: **Restrict creations**, **Restrict updates**, **Restrict deletions**.

With Ruleset B every branch except `claude/**` and `dependabot/**` can be created, updated or deleted only by an admin. Claude Code (through the Claude GitHub App) can then create and push `claude/*` branches and open pull requests, but cannot merge: `main` needs a pull request, the merge is yours.

To be stricter, drop the `claude/**` exclusion and add the Claude GitHub App to the bypass list of Ruleset B instead (bypass actors can be roles, teams and apps, not individual users). Then even `claude/*` branches are created only by you or the app.

### Ruleset C: "Protect release tags"

- Target: **Tags**, pattern `v*`.
- Rules: Restrict creations, updates and deletions.
- Bypass list: Repository admin.

## 3. Collaborators and permissions

- Settings > Collaborators: nobody except you (a rule is only as strong as the list of people with write access). Check **Settings > Manage access** after every invitation.
- Settings > General > Pull Requests: allow merge commits; tick **Automatically delete head branches**.
- Settings > Actions > General:
  - "Fork pull request workflows from outside collaborators": **Require approval for all outside collaborators**.
  - Workflow permissions: **Read repository contents** by default.
  - Actions permissions: **Allow HunKonTech, and select non-HunKonTech, actions and reusable workflows** with **Allow actions created by GitHub**, and tick **Require actions to be pinned to a full-length commit SHA** (the workflows pin every action).
- All workflows run on GitHub-hosted runners. Do not add a self-hosted runner to a public repository: `close-external-prs.yml` (`pull_request_target`) starts for every pull request without approval. Settings > Actions > Runners must be empty; for an organization runner, remove the repository from the runner group (Organization settings > Actions > Runner groups) and turn off **Allow public repositories**.
- Settings > Code security (Advanced Security):
  - **Private vulnerability reporting**: on.
  - **Dependabot alerts**: on. **Dependabot security updates**: off (npm packages are updated by hand, see `docs/RELEASING.md`). `.github/dependabot.yml` asks for monthly updates of the pinned GitHub Actions only; `close-external-prs.yml` lets `dependabot[bot]` pull requests through.
  - **Secret scanning** with **Push protection**: on.
  - **Code scanning > CodeQL analysis > Set up > Default** (languages: JavaScript/TypeScript, GitHub Actions).

## 4. Wiki and Issues

- Settings > General > Features: Wiki on, then tick **Restrict editing to users with push access** (only you). Publishing steps: `docs/wiki/README.md`.
- Issues on (support channel). Discussions off for now.
- Projects, Sponsorships: off.

## 5. Check

1. From another GitHub account (or incognito) confirm you cannot push or create a branch.
2. Open a PR from a `claude/test` branch: it must stay open.
3. Try `git push origin main` as yourself: with Ruleset A active and the bypass set to pull requests only, it is refused.
4. The next pull request runs `close-external-prs` on `ubuntu-latest`, and CI stays green with SHA pinning required.
