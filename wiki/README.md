# Wiki sources

These files are the source of the GitHub wiki (English). The wiki lives in a separate repository (`KoApiDoc.wiki.git`), so publish by hand:

1. In the GitHub repository, open **Wiki** and create the first page (any content) to initialise it.
2. ```bash
   git clone https://github.com/HunKonTech/KoApiDoc.wiki.git
   cp -r wiki/* KoApiDoc.wiki/ && rm KoApiDoc.wiki/README.md
   cd KoApiDoc.wiki && git add -A && git commit -m "Update wiki" && git push
   ```
3. Settings > General > Features > Wiki: tick **Restrict editing to users with push access**.

Edit these sources in `wiki/` and re-copy; the wiki repo has no review step.
