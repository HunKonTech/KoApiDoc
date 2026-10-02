# KoApiDoc – biztonsági javítási terv

Forrás: [`SECURITY-AUDIT-2026-10-02.md`](SECURITY-AUDIT-2026-10-02.md) (17 találat: 5 közepes, 8
alacsony, 4 info, kritikus/magas nincs). Állapot: az 1. és a 2. lépés kész ([#15](https://github.com/HunKonTech/KoApiDoc/pull/15)), a 3. és az 5. lépés kész ([#17](https://github.com/HunKonTech/KoApiDoc/pull/17)); a 4. lépés (repóbeállítások) kézi admin teendő, a 6. (élő ellenőrzés) még hátra van. A 3–5. lépés részletes terve: [`REMEDIATION-PLAN-3-5.md`](REMEDIATION-PLAN-3-5.md); a találatonkénti állapot az audit riportban. Atlassian site-ra
csak a 6. lépésben települ valami (dev site), és az is csak külön jóváhagyással.

## Áttekintés

| #   | Lépés                         | Találatok                               | Súlyosság (max) | Függ                 | Forma            | Állapot |
| --- | ----------------------------- | --------------------------------------- | --------------- | -------------------- | ---------------- | ------- |
| 1   | Authorize út lezárása + CSP   | KOA-01, KOA-02                          | Közepes         | –                    | PR               | kész (#15) |
| 2   | CI-hardening                  | KOA-05, KOA-03, KOA-04, KOA-12          | Közepes         | –                    | PR               | kész (#15) |
| 3   | Bemenetkezelés                | KOA-06, KOA-07, KOA-08, KOA-09, KOA-14, KOA-15 | Alacsony | 1 (fixture mappa)    | PR               | kész (#17) |
| 4   | Repó-beállítások              | KOA-11                                  | Alacsony        | 2 (SHA-pinning után) | kézi, GitHub UI  | nyitott (admin) |
| 5   | Dokumentáció                  | KOA-13, KOA-10, KOA-16, KOA-17          | Alacsony/info   | 1, 3                 | PR               | kész (#17) |
| 6   | Élő ellenőrzés Forge dev site-on | KOA-01, KOA-02 (+ KOA-07 nyitott kérdés) | –          | 1                    | kézi             | nyitott |

Az 1. és 2. lépés párhuzamosan mehet. Minden PR előtt: `npm run lint`, `format:check`,
`typecheck`, `test`, `build`, `test:e2e`.

## 1. Authorize út lezárása + szigorú CSP (KOA-01, KOA-02)

1. `SwaggerView.tsx`: új `readOnlyPlugin` a `searchPlugin` mellé:
   `components: { AuthorizeBtnContainer: () => null, authorizeOperationBtn: () => null }`.
   Megfontolandó még: `AuthorizationPopup`, `auths` komponensek nullázása is (védelem, ha az
   állapot más úton nyílna meg).
2. `index.html` meta CSP cseréje az auditban kipróbált policyre:
   `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self'; frame-src 'none'; form-action 'none'; object-src 'none'; base-uri 'self'`.
   Ellenőrizni, hogy a Vite dev szerver (`dev:local`, HMR websocket) működik-e; ha nem, a CSP
   csak a production buildbe kerüljön (Vite `transformIndexHtml` plugin mode alapján).
3. Fixture-ök: `tests/fixtures/malicious/oauth2-password.json`, `oauth2-implicit.json`,
   `oauth2-swagger2.json` (Swagger 2.0 `securityDefinitions`).
4. Tesztek:
   - e2e: mindhárom fixture-rel 0 `.btn.authorize` és 0 `.authorization__btn`; nincs popup
     (`page.on('popup')`), nincs kimenő kérés a `tokenUrl`-re.
   - e2e: CSP meta jelen van a buildelt `dist/index.html`-ben.
5. Elfogadás: a meglévő e2e és a vizuális tesztek zöldek; az auditbeli PoC nem reprodukálható.

Kockázat: a `connect-src 'self'` a `@forge/bridge` működését élőben megtörheti (postMessage nem
érintett, de ellenőrizni kell) → 6. lépés a kiadás előtt kötelező.

## 2. CI-hardening (KOA-05, KOA-03, KOA-04, KOA-12)

1. `close-external-prs.yml`: `runs-on: ubuntu-latest` (KOA-05). Utána a self-hosted runner
   leválasztása a repóról (kézi, 4. lépés).
2. `ci.yml`: a `FORGE_*` `env` a job szintről a `forge lint` lépésre; a feltétel
   `if: ${{ secrets.FORGE_API_TOKEN != '' }}` helyett lépésszintű env + `env.FORGE_API_TOKEN`
   ellenőrzés (a `secrets` kontextus `if`-ben nem mindenhol elérhető) (KOA-03).
   Opcionális: `forge` GitHub Environment a titkoknak.
3. Minden `uses:` teljes 40 karakteres SHA-ra, verzió-kommenttel (`# v4.x.y`) (KOA-04).
4. Minden `actions/checkout`: `persist-credentials: false` (KOA-12).
5. Validálás: `actionlint` és `zizmor` 0 közepes+ találattal (a dokumentált hamis pozitívok
   kivételével); a PR CI-ja zöld.

`npm ci --ignore-scripts`: csak akkor, ha a build és a Playwright install nélküle is megy
(a `@forge/cli` és esbuild/rollup natív binárisai miatt valószínűleg nem); külön kipróbálni,
nem kötelező része a PR-nek.

## 3. Bemenetkezelés (KOA-06, -07, -08, -09, -14, -15)

1. KOA-06 `externalRefs.ts`: iteratív (explicit stack) bejárás mélységkorlát nélkül, vagy a
   200 szintnél mélyebb dokumentum elutasítása érthető hibával. Javaslat: iteratív, mert a
   20 000 szintes JSON-t a parse már elutasítja. Teszt: 205 szint mély külső `$ref` → cserélve,
   figyelmeztetés megjelenik.
2. KOA-07 `confluenceSpecSource.ts`: tulajdonos = `pageId ?? blogPostId ?? customContentId`;
   ha egyik sincs vagy nem egyezik → `missing`. Unit teszt mindhárom esetre + hiányzó tulajdonos.
3. KOA-08: `MAX_SPEC_BYTES` az inline szövegre (`ConfigMacro`: figyelmeztetés mentés előtt;
   `ViewMacro`: elutasítás), `exceedsNodes` a JSON-ra is (`parseSpec.ts`). Teszt: 2 MB + 1 bájt
   inline spec → hibaüzenet.
4. KOA-09: hiányzó/nem szám `fileSize` → elutasítás; `Content-Length` ellenőrzése letöltéskor,
   ha a bridge válasz ad fejlécet. Stream-olvasás csak, ha a `requestConfluence` válasza
   ad `body`-t (ellenőrizni). Teszt: `fileSize` nélküli metaadat → elutasítva.
5. KOA-14: `out[key] = …` helyett `Object.defineProperty` (`externalRefs.ts`, `specFilter.ts`).
   Teszt: `__proto__` kulcsos spec → a másolat saját kulcsként tartalmazza, prototípusa változatlan.
6. KOA-15: a `next` link `new URL(next, 'https://x').pathname` normalizálása után
   `startsWith('/wiki/api/v2/')`. Teszt: `/wiki/api/v2/../../rest/x` → elutasítva.
7. A malicious fixture-ök ugyanabba a `tests/fixtures/malicious/` mappába (1. lépés hozza létre).

## 4. Repó-beállítások (KOA-11, KOA-05 maradék) – kézi, admin

- Secret scanning push protection: be.
- Dependabot: `github-actions` ökoszisztéma `.github/dependabot.yml`-ben (a SHA-pinnelt
  actionök frissítéséhez); npm marad kézi, a `RELEASING.md` szerint.
- CodeQL default setup (JavaScript/TypeScript, Actions).
- "Protect main" ruleset: admin bypass `always` → `pull_request`; megfontolni 1 jóváhagyást.
- Actions beállítás: "Require actions to be pinned to a full-length commit SHA", csak GitHub és
  verified actionök (a 2. lépés merge-e után, különben a CI elbukik).
- Self-hosted runner eltávolítása vagy runner-csoport korlátozása (nyilvános repók tiltva).

## 5. Dokumentáció (KOA-13, KOA-10, KOA-16, KOA-17)

- `SECURITY.md`, `docs/PRIVACY.md`, `docs/MARKETPLACE-LISTING.md`: az állítások
  felülvizsgálata az 1. és 3. lépés után; az "Authorize" letiltás és a szigorúbb CSP
  megemlítése.
- `RELEASING.md`: KOA-10 maradjon dokumentált kivétel, kiadás előtti `npm audit` ellenőrzéssel.
- KOA-16/KOA-17: nincs teendő; opcionálisan a resolver eltávolítása a manifestből, amíg nincs
  definíciója (`forge lint` után).
- Az audit riport státusz-oszlopának frissítése (nyitott → javítva, PR link).

## 6. Élő ellenőrzés Forge dev site-on (külön jóváhagyással)

- `forge deploy` + `forge install` egy dev site-ra; ellenőrizni: a makró renderel, a
  `requestConfluence` működik a szigorú CSP-vel, oauth2 sémás spec mellett nincs Authorize gomb.
- Nyitott kérdések: a v1 letöltő végpont ellenőrzi-e a szülőt (KOA-07), a macro-config
  méretkorlátja (KOA-08), `forge lint` lefuttatása.

## Kész, ha

Minden közepes és alacsony találat javítva vagy dokumentált, elfogadott kockázat; a
regressziós tesztek a CI-ban futnak; a dokumentáció állításai igazak; az auditban szereplő
eszközök (zizmor, semgrep, npm audit production) újrafuttatva nem adnak új közepes+ találatot.
