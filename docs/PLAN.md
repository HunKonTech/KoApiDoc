# KoApiDoc – Tervezési dokumentum

Confluence app, amely Swagger/OpenAPI (2.0, 3.0, 3.1; JSON/YAML) specifikációt jelenít meg egy oldalon makróként.

## 1. Platform és publikálás

| | **Confluence Cloud** | **Confluence Data Center** |
|---|---|---|
| Keretrendszer | **Atlassian Forge** (ajánlott, Connect kivezetés alatt) | P2 plugin (Atlassian Plugin SDK) |
| Nyelv | TypeScript / JavaScript (Node.js runtime + React) | Java 17+ (Maven), frontend JS |
| Hosting | Atlassian infrastruktúra, nincs saját szerver | Ügyfél saját szerverén fut |
| Terjesztés | Marketplace listing (Forge app) | Marketplace listing (.jar/.obr) |

**Javaslat:** Cloud-first, Forge-dzsal. DC csak később, ha van igény (Atlassian a Server-t megszüntette, a DC is csökkenő piac).

### Fiók és költségek
- **Atlassian fiók:** ingyenes – https://id.atlassian.com/signup?application=mpac
- **Ingyenes fejlesztői Confluence site:** https://go.atlassian.com/cloud-dev
- **Marketplace partner (vendor) profil:** ingyenes, magánszemélyként is (saját név) – https://marketplace.atlassian.com/manage/vendor/create
- **Listázás / review:** nincs díj. Ingyenes appnál nincs revenue share.
- **Forge használat:** 2026. jan. 1. óta használatalapú, de **appenként havi ingyenes keret** van (pl. 200 000 GB-s compute, 0,1 GB KVS, 1 GB log). Csak a keret feletti részt számlázzák a fejlesztőnek. Egy kliensoldali renderelő (Custom UI, szinte nincs backend) várhatóan bőven a kereten belül marad.
- Források: [Become a partner](https://developer.atlassian.com/platform/marketplace/become-a-partner/), [Listing Forge apps](https://developer.atlassian.com/platform/marketplace/listing-forge-apps/), [Forge pricing](https://developer.atlassian.com/platform/forge/forge-platform-pricing/)
- Figyelem: a saját éles site-ra telepítés számlázást indíthat, tesztelni dev site-on kell.

### Marketplace publikálás lépései (Cloud/Forge)
1. Atlassian fiók + `forge` CLI (`npm i -g @forge/cli`).
2. `forge create` → `forge deploy` → `forge install` saját dev site-ra (ingyenes dev Confluence site).
3. Marketplace **vendor/partner** profil létrehozása, Developer console-ban sharing engedélyezése, developer space publikálása.
4. App listing: leírás, ikon, képernyőképek, **EULA/licenc link**, **Privacy Policy**, support elérhetőség.
5. Ingyenes app: „Free” fizetési modell (nincs Atlassian revenue share).
6. Atlassian review (biztonsági és minőségi ellenőrzés), utána publikus.
7. Opcionális: **Runs on Atlassian** badge (Forge, külső adatkimenet nélkül) – bizalmi előny.

## 2. Licenc

Kívánság: *bárki ingyen használhatja, módosítani csak engedéllyel*.

Ez **nem nyílt forráskód** (OSI definíció tiltja a módosítás korlátozását), tehát MIT/Apache/GPL kiesik.

| Opció | Ingyenes használat | Módosítás | Forrás látható | Megjegyzés |
|---|---|---|---|---|
| **Saját freeware EULA (zárt)** | ✔ | ✘ (csak engedéllyel) | ✘ | Legegyszerűbb, Marketplace-en szokásos |
| **Source-available saját licenc** | ✔ | ✘ engedély nélkül | ✔ (pl. publikus GitHub) | Átlátható, bizalmat ad |
| PolyForm Strict 1.0.0 | ✔ (nem kereskedelmi célra) | ✘ | ✔ | Kész szabványszöveg, de **cégeknél kereskedelmi használatot tilt** → nem illik |
| PolyForm Noncommercial / CC BY-NC-ND | részben | ND = tiltja | ✔ | Kereskedelmi korlát → Confluence cégeknek nem jó |
| Business Source License (BSL) | ✔ (Additional Use Grant-tal) | ✔ (módosítás engedett) | ✔ | Módosítást enged → nem illik |

**Döntés:** publikus repó, *source-available, saját licenc* (`LICENSE` a repóban) + ugyanaz EULA-ként a Marketplace-en. Tartalom röviden:
- Ingyenes használat bárkinek, kereskedelmi célra is.
- Módosítás, származékos mű, újraterjesztés, újrapublikálás **csak írásos engedéllyel**.
- Külső hozzájárulást (kódot) nem fogadunk el → CLA nem kell.
- Garancia és felelősség kizárása („AS IS”).
- Irányadó jog (pl. magyar).

> Megjegyzés: a végleges szöveget érdemes jogásszal átnézetni. Publikus repóban a módosítást technikailag nem lehet megakadályozni, csak jogilag tiltani.

### Harmadik fél függőségek
A felhasznált könyvtárak licencét be kell tartani (pl. Swagger UI / Redoc: Apache-2.0 / MIT) → `THIRD_PARTY_NOTICES` fájl kell. Ezek a saját licencünket nem korlátozzák.

### Repó: publikus, de csak a tulajdonos commitolhat
GitHubon publikus repóba idegen alapból sem tud pusholni, csak forkolni és PR-t nyitni. Beállítások:
- Nincs collaborator; **Branch protection / ruleset** a `main`-en (csak te, force-push tiltva).
- `CONTRIBUTING.md`: „Külső pull requestet nem fogadunk el, hibát issue-ban jelezz.”
- Opcionális: PR-ek automatikus lezárása GitHub Actionnel (pl. `superbrothers/close-pull-request`), vagy Settings → *Interaction limits*.
- Issue-k nyitva maradhatnak hibabejelentésre (vagy kikapcsolhatók).
- Fork technikailag nem tiltható publikus repónál; a módosítást csak a licenc tiltja.

## 3. Technológia (Cloud/Forge)

- **Nyelv:** TypeScript.
- **UI:** Forge **Custom UI** (React) – a renderelőhöz kell, a UI Kit nem elég.
- **Renderelő:** Swagger UI (`swagger-ui-react`) vagy **Redoc**; alternatíva: Scalar. Javaslat: Swagger UI („Try it out” miatt), Redoc opcióként.
- **Parser/validáció:** `@apidevtools/swagger-parser` vagy `@readme/openapi-parser`, YAML: `js-yaml`.
- **Tárolás:** makró konfiguráció + Forge Storage / Confluence csatolmány.
- **Build:** Vite, ESLint, Vitest; CI: GitHub Actions (`forge lint`, tesztek).

### Funkciók (MVP)
1. Confluence makró: spec forrása **csatolmány**, **beillesztett szöveg** vagy **URL**.
2. Renderelés Swagger UI-jal, tag-ek szerinti navigáció.
3. Hibás spec esetén olvasható hibaüzenet.
4. Sötét/világos téma követése.

### Később
- Redoc/Scalar nézetválasztó, verzió-összehasonlítás (diff), export PDF-be, DC változat.

## 4. Buktatók

1. **CSP / sandbox:** Forge Custom UI szigorú Content Security Policy-t használ; inline script/style és külső erőforrások engedélyezése a `manifest.yml`-ben kell. Swagger UI-t bundle-ölni kell, CDN nem jó.
2. **„Try it out” / külső hívások:** böngészőből CORS-ba ütközik, Forge `egress` engedély kell minden domainhez → URL-es spec betöltés és API próbahívás korlátozott. Külső egress elveszti a „Runs on Atlassian” badge-et.
3. **Méretkorlátok:** Forge function timeout, payload és storage limitek; nagy (több MB-os) specek lassúak. Lazy render, szerveroldali parse kerülése.
4. **Bundle méret:** Swagger UI nagy (~1 MB+) → code splitting.
5. **`$ref` feloldás:** külső fájlra mutató ref-ek csatolmányból nehezen oldhatók fel.
6. **OpenAPI 3.1** támogatás egyes renderelőkben hiányos.
7. **Biztonság (XSS):** a spec description mezői Markdown/HTML-t tartalmazhatnak → sanitizálás.
8. **Jogosultságok (scopes):** csak a minimálisan szükséges scope-ok; scope-bővítés frissítéskor admin újraengedélyezést igényel.
9. **Exportok:** Confluence PDF/Word export és mobil app nem futtat Custom UI-t → statikus fallback kell.
10. **Marketplace követelmények:** privacy policy, support, adatkezelési (GDPR) nyilatkozat, biztonsági program (bug bounty részvétel lehet elvárás).
11. **Licenc betartatás:** zárt/source-available kódot nem lehet technikailag védeni; csak jogi út.
12. **Cloud vs DC:** két teljesen külön kódbázis lenne (TS vs Java) – ezért csak Cloud az első körben.

## 5. Ütemterv (vázlat)

1. Forge „hello world” makró saját dev site-on.
2. Csatolmányból spec betöltés + Swagger UI render.
3. Beillesztett szöveg, URL forrás, hibakezelés.
4. Tesztek, CI, LICENSE, EULA, privacy policy.
5. Marketplace listing és review.

## 6. Nyitott kérdések
- Kell-e Data Center változat?
- „Try it out” kell-e (egress miatt)?
