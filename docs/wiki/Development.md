# Development

Stack: TypeScript, React, Vite, Swagger UI (lazy chunk), Atlassian Forge Custom UI, Vitest, Playwright.

```bash
npm ci
npm run dev:local     # mock mode in the browser, no Atlassian account needed
npm test              # unit tests
npm run build
```

End-to-end tests (Playwright, with axe accessibility checks) run in CI. See the repository `README.md`, `docs/RELEASING.md` and `docs/PLAN.md` for details.

Nothing is deployed to Atlassian from CI; `forge register`, `deploy` and `install` are manual, owner-only steps.
