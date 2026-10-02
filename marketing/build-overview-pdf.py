"""Builds marketing/KoApiDoc-overview.pdf (needs: pip install reportlab).

Run from the repository root: python3 marketing/build-overview-pdf.py
"""
from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (BaseDocTemplate, Frame, Image, KeepTogether, PageBreak,
                                PageTemplate, Paragraph, Spacer, Table, TableStyle)

M = Path(__file__).parent
OUT = M / "KoApiDoc-overview.pdf"
INK, MUTED, ACCENT, LINE = colors.HexColor("#1f2933"), colors.HexColor("#5f6b7a"), colors.HexColor("#2457c5"), colors.HexColor("#d5dbe3")
W = A4[0] - 40 * mm

body = ParagraphStyle("b", fontName="Helvetica", fontSize=10.5, leading=15, textColor=INK, spaceAfter=6)
h1 = ParagraphStyle("h1", parent=body, fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=ACCENT, spaceBefore=4, spaceAfter=8)
h2 = ParagraphStyle("h2", parent=body, fontName="Helvetica-Bold", fontSize=12.5, leading=16, spaceBefore=8, spaceAfter=3)
cap = ParagraphStyle("c", parent=body, fontSize=9, leading=12, textColor=MUTED, spaceAfter=10)
cell = ParagraphStyle("t", parent=body, fontSize=9.5, leading=13, spaceAfter=0)
bul = ParagraphStyle("bu", parent=body, leftIndent=12, bulletIndent=0, spaceAfter=3)


def shot(name, caption, width=W):
    img = Image(str(M / "screenshots" / name), width=width, height=width * 900 / 1840)
    return KeepTogether([img, Spacer(1, 3), Paragraph(caption, cap)])


def bullets(items):
    return [Paragraph(t, bul, bulletText="•") for t in items]


def table(rows, widths):
    t = Table([[Paragraph(c, cell) for c in r] for r in rows], colWidths=widths)
    t.setStyle(TableStyle([("GRID", (0, 0), (-1, -1), 0.5, LINE), ("VALIGN", (0, 0), (-1, -1), "TOP"),
                           ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f3f6fa")),
                           ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4)]))
    return t


def footer(c, d):
    c.saveState()
    c.setFont("Helvetica", 8)
    c.setFillColor(MUTED)
    c.drawString(20 * mm, 10 * mm, "KoApiDoc for Confluence - overview")
    c.drawRightString(A4[0] - 20 * mm, 10 * mm, f"{d.page}")
    c.restoreState()


doc = BaseDocTemplate(str(OUT), pagesize=A4, title="KoApiDoc for Confluence - overview",
                      author="HunKonTech", subject="What KoApiDoc is and how it works")
doc.addPageTemplates([PageTemplate(id="p", frames=[Frame(20 * mm, 18 * mm, W, A4[1] - 36 * mm, id="f")], onPage=footer)])

s = []
s.append(Image(str(M / "banner-1120x548.png"), width=W, height=W * 548 / 1120))
s.append(Spacer(1, 10))
s.append(Paragraph("Your API reference, right on the Confluence page", h1))
s.append(Paragraph("KoApiDoc renders Swagger 2.0, OpenAPI 3.0 and OpenAPI 3.1 specifications as a read-only, "
                   "searchable API reference on Confluence Cloud pages. Paste the specification into the macro, "
                   "or attach the JSON or YAML file to the page. This document explains what the app does, "
                   "how it is used, and what it deliberately does not do.", body))
s.append(Paragraph("At a glance", h2))
s.append(table([
    ["What", "A Confluence Cloud macro (built on Atlassian Forge) that shows an API specification as a browsable reference."],
    ["Supports", "Swagger 2.0, OpenAPI 3.0.x, OpenAPI 3.1.x; JSON and YAML; attachments up to 2 MB."],
    ["Sources", "Text pasted into the macro, or a .json / .yaml / .yml attachment of the same page (always the latest version)."],
    ["Safety", "Runs on Atlassian. No external network access, no own server, no data collected. Reads attachments with the permissions of the viewer."],
    ["Looks", "Follows the Confluence light and dark theme."],
    ["Price", "Free to use, also commercially. Source-available; modification and redistribution need the owner's permission."],
], [28 * mm, W - 28 * mm]))
s.append(PageBreak())

s.append(Paragraph("The problem it solves", h1))
s.append(Paragraph("Teams keep their API specification in a repository, but the people who need to read it (support, "
                   "product, partners, new developers) work in Confluence. Copying the spec into a page by hand "
                   "goes stale; linking to an external viewer means leaving the page and often another tool. "
                   "KoApiDoc puts a live, readable reference where the team already reads documentation.", body))
s.append(shot("01-view-light.png", "The macro on a page: operations grouped by tag, with methods, paths and summaries."))
s.append(Paragraph("Always the latest version", h2))
s.append(Paragraph("Point the macro at a .json or .yaml attachment of the page. Upload a new version of the file "
                   "and the page shows it the next time it is opened - no editing of the page needed. If you "
                   "prefer, paste the specification straight into the macro instead.", body))
s.append(shot("05-configuration.png", "Configuration: choose the source and the display options."))
s.append(PageBreak())

s.append(Paragraph("Built for large APIs", h1))
s.append(Paragraph("Readers can search by path, method, summary, operation ID or tag. Editors can show only the "
                   "tags readers need, choose how much is expanded on load, hide the schemas section or the "
                   "search box, and pick an automatic or fixed height for long specifications.", body))
s.append(shot("04-search.png", "Search narrows the operations as you type; several words must all match."))
s.append(shot("03-operation-details.png", "An expanded operation: parameters, request body example, responses."))
s.append(PageBreak())

s.append(Paragraph("For editors and readers", h1))
s.append(shot("06-configuration-preview.png", "Live preview while configuring (dark theme shown).", width=W * 0.8))
s.append(shot("02-view-dark.png", "The macro follows the Confluence dark theme.", width=W * 0.8))
s.append(Paragraph("Clear messages instead of silent failures", h2))
s.append(Paragraph("A broken spec, a missing attachment or a file the viewer may not open each produce a short, "
                   "readable message. References to external files are listed rather than failing silently.", body))
s.append(shot("07-external-ref-warning.png", "External $ref targets are listed above the documentation.", width=W * 0.6))
s.append(PageBreak())

s.append(Paragraph("How to use it", h1))
for i, t in enumerate(["Edit the Confluence page and type <b>/</b>, then choose <b>KoApiDoc</b>.",
                       "Choose the source: paste the specification, or pick an attached .json / .yaml file.",
                       "Set the display options and check the live preview.",
                       "Save and publish. Readers see the reference; upload a new file version to update it."], 1):
    s.append(Paragraph(t, bul, bulletText=f"{i}."))
s.append(Paragraph("Security and privacy", h2))
s += bullets(["Runs entirely on Atlassian's Forge platform; the app declares no external network access.",
              "Reads only attachments of the page that contains the macro, and only reads - it never creates or changes content.",
              "Uses the permissions of the person viewing the page; no access means an error message, never the content.",
              "The specification is processed in the reader's browser. Nothing is stored outside Confluence and nothing is sent to the developer or third parties.",
              "A pasted specification is stored in the page, so it is visible to those who can edit the page and kept in the page history."])
s.append(Paragraph("Deliberate limitations", h2))
s += bullets(["No \"Try it out\": requests to your API are not sent from the page.",
              "References to external files or URLs are not loaded (bundle the spec into one file first).",
              "Remote images in descriptions are blocked; embedded data: images work.",
              "Confluence PDF/Word export and printing do not run app macros, so the documentation is missing there.",
              "Attachments of the same page only; one specification per macro."])
s.append(Paragraph("Quality", h2))
s.append(Paragraph("The app is written in TypeScript and tested with unit tests and end-to-end tests including "
                   "automated accessibility checks. Source code, user guide and privacy policy are public.", body))
s.append(Paragraph("Links", h2))
s.append(table([
    ["Source", "https://github.com/HunKonTech/KoApiDoc"],
    ["User guide", "https://github.com/HunKonTech/KoApiDoc/blob/main/docs/USER-GUIDE.md"],
    ["Privacy policy", "https://github.com/HunKonTech/KoApiDoc/blob/main/docs/PRIVACY.md"],
    ["Support", "https://github.com/HunKonTech/KoApiDoc/issues"],
], [28 * mm, W - 28 * mm]))
s.append(Spacer(1, 8))
s.append(Paragraph("Not yet published on the Atlassian Marketplace. Product names mentioned belong to their owners; "
                   "KoApiDoc is not affiliated with or endorsed by Atlassian.", cap))
doc.build(s)
print(OUT)
