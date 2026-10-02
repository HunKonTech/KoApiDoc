# Wiki sources

These files are the source of the GitHub wiki (English). GitHub wikis live in a separate repository, which can only be pushed to by someone with write access, so publish by hand:

1. In the GitHub repository, open **Wiki** and create the first page (any content) to initialise `KoApiDoc.wiki.git`.
2. ```bash
   git clone https://github.com/HunKonTech/KoApiDoc.wiki.git
   cp -r docs/wiki/* KoApiDoc.wiki/ && rm KoApiDoc.wiki/README.md
   cd KoApiDoc.wiki && git add -A && git commit -m "Initial wiki" && git push
   ```
3. Settings > General > Features > Wiki: tick **Restrict editing to users with push access** (with the rulesets in `docs/GITHUB-SETUP.md` that means only you).

Edit these sources in `docs/wiki` and re-copy; the wiki repo has no review step.
