---
name: Observatoire CRA
description: Measured, dated, citable findings on CRA readiness, published as a numbered act on register paper.
colors:
  tampon: "#5a2d82"
  tampon-dark: "#b99be0"
  tampon-fond: "color-mix(in srgb, #5a2d82 10%, #ffffff)"
  encre: "#161616"
  encre-dark: "#ebebe6"
  gris: "#5e5e5e"
  gris-dark: "#a5a6a0"
  filet: "#d9dad6"
  filet-dark: "#33363a"
  papier: "#ffffff"
  papier-dark: "#121314"
  marge: "#f2f3f0"
  marge-dark: "#191b1c"
typography:
  display:
    fontFamily: "Charter, \"Bitstream Charter\", \"Iowan Old Style\", \"Sitka Text\", Cambria, Georgia, serif"
    fontSize: "clamp(30px, 3.4vw, 44px)"
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Charter, \"Bitstream Charter\", \"Iowan Old Style\", \"Sitka Text\", Cambria, Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.005em"
  title:
    fontFamily: "Charter, \"Bitstream Charter\", \"Iowan Old Style\", \"Sitka Text\", Cambria, Georgia, serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Charter, \"Bitstream Charter\", \"Iowan Old Style\", \"Sitka Text\", Cambria, Georgia, serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.6
  note:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, \"Segoe UI\", system-ui, Roboto, \"Helvetica Neue\", Arial, sans-serif"
    fontSize: "13px"
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "\"tnum\""
  mono:
    fontFamily: "ui-monospace, \"SF Mono\", Menlo, Consolas, \"Liberation Mono\", monospace"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  hair: "2px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "24px"
  lg: "48px"
  running-head: "44px"
  rail: "248px"
  measure: "680px"
  margin-notes: "260px"
components:
  running-head:
    backgroundColor: "{colors.papier}"
    textColor: "{colors.encre}"
    typography: "{typography.label}"
    height: "44px"
    padding: "0 clamp(16px, 3vw, 40px)"
  rail-link:
    textColor: "{colors.encre}"
    typography: "{typography.note}"
    rounded: "{rounded.hair}"
    padding: "8px 10px 8px 24px"
  rail-link-current:
    textColor: "{colors.tampon}"
  margin-note:
    textColor: "{colors.gris}"
    typography: "{typography.note}"
    rounded: "{rounded.hair}"
    padding: "6px 8px"
  margin-note-target:
    backgroundColor: "{colors.tampon-fond}"
    textColor: "{colors.encre}"
  specimen:
    backgroundColor: "{colors.marge}"
    textColor: "{colors.encre}"
    typography: "{typography.mono}"
    padding: "20px 22px"
  inline-code:
    backgroundColor: "{colors.marge}"
    rounded: "{rounded.hair}"
    padding: "0.08em 0.3em"
  skip-link:
    backgroundColor: "{colors.encre}"
    textColor: "{colors.papier}"
    padding: "10px 14px"
---

# Design System: Observatoire CRA

## Overview

**Creative North Star: "The Register"**

Each measurement is published as a dated, numbered act and each finding as a citable article. The grammar comes from official gazette publishing (act title in small caps, numbered articles, numbered paragraphs, footnote apparatus in the margin, annexes) translated without any institutional identity. The page reads like a document of record, not a dashboard: one long, quiet column of serif prose, a contents rail on the left, notes in the right margin.

Density is that of a legal text: generous measure, hairline rules between articles, no cards, no fills, no imagery. Data appears as prose first, then as a relevé of marks and as ruled tables. A single ink-violet "tampon" carries the reader's attention to exactly two things: the headline figure and where they currently are.

The site is light and dark (following the system preference). A related surface, the per-company report (`scripts/fiche.mjs`), uses the same palette, faces, marks and rules in a reduced, light-only, print-oriented form: one 760px column, sans section heads underlined by a hairline, and the tampon on the one sample figure.

**Key Characteristics:**
- Register paper, ink and hairlines; one accent.
- System serif for reading, system sans for apparatus (running head, rail, notes, tables, captions).
- States expressed by mark shape (filled, hatched, hollow), never by colour.
- Numbered articles and paragraphs; footnote calls link to margin notes.
- Flat: no shadows, corners at most 2px.

## Colors

A cool, near-monochrome register palette with one stamp-violet accent.

### Primary
- **Tampon Violet** (tampon; tampon-dark in dark mode): the official stamp. Used on the headline figure inside the finding sentence, the current rail entry (its number and filled square mark), the focus ring, text selection (24% mix) and, as Tampon Wash (tampon-fond, 10% mix), the background of a targeted margin note.

### Neutral
- **Register Ink** (encre / encre-dark): all text, the running-head and footer rules, table header and total rules, the outline and fill of relevé marks.
- **Archive Grey** (gris / gris-dark): secondary text: margin notes, captions, paragraph numbers, rail article numbers, table header labels, the footer.
- **Hairline** (filet / filet-dark): rules between articles, table rows, list rows, the rail border, specimen border, hollow rail marks.
- **Register Paper** (papier / papier-dark): page and running-head background.
- **Grey-Green Margin** (marge / marge-dark): the contents rail, code specimens and inline code.

### Named Rules
**The One Stamp Rule.** Tampon Violet marks only the headline figure and the reader's place (current article, focus, selection, targeted note). Never a link colour, heading colour, chart fill or decoration.

**The Ink States Rule.** Data states are drawn in ink by shape (filled, hatched at 45 degrees, hollow), so they survive greyscale print and colour-blind reading. No status colours.

## Typography

**Display Font:** Charter (with Bitstream Charter, Iowan Old Style, Sitka Text, Cambria, Georgia, serif)
**Body Font:** the same system serif
**Label/Mono Font:** system sans (-apple-system, Segoe UI, system-ui, Roboto) for apparatus; ui-monospace for file contents and field names

**Character:** a bookish transitional serif carries the act and its argument; a plain system sans carries everything that is apparatus around the text. System fonts only: no web font is loaded.

### Hierarchy
- **Display** (400, clamp 30 to 44px, 1.14, slight negative tracking, balanced wrap): the finding sentence of an article only; its figure is set in lining tabular numerals in Tampon Violet, not italic.
- **Headline** (600, 24px, 1.25; 22px under 640px): article and annex headings, "Article premier — Constat", "Annexe I — …".
- **Title** (400, 20px, 1.5, centred, balanced; 18px and left-aligned under 640px): the act intitulé. Its opening designation is set at 18px in small caps as part of the h1.
- **Body** (400, 18px, 1.6; 17px under 640px): paragraphs, max 66ch. Numbered paragraphs prefix a sans grey tabular number.
- **Note** (sans 400, 14px, 1.5): margin notes and the rail; captions and table captions at 13px/1.45.
- **Label** (sans 500, 13px, tabular numerals): the running head; table header labels 12px 600 grey.
- **Mono** (14px, 1.7 in specimens; 0.84em inline): file contents, field names, paths.

### Named Rules
**The Apparatus Rule.** Serif for what is argued, sans for what frames it. Running head, rail, notes, captions, tables and dates are always sans; prose and headings are always serif.

**The Tabular Figures Rule.** Every number that can be compared (dates, counts, percentages, rail numbers) uses tabular numerals.

## Layout

Desktop is a three-zone document: a sticky 44px running head across the top (brand · "indépendant" left, measure number centre, date right, ink rule below); a 248px grey-green contents rail on the left whose list is sticky under the head; a main column holding articles. Each article is a two-column grid: text at up to 680px, a 48px gutter, 260px margin notes. Wide content (tables, register) spans both columns. Main padding is clamp(16px, 4vw, 64px) sideways, 96px at the bottom.

Rhythm: articles are separated by a hairline and 48px padding (36px on mobile); headings take 22px below, the finding 28px, paragraphs 14px. Ruled lists (signals, deadlines) use a 190px term column, 20px gap, 18px row padding.

Under 1100px the rail disappears and a collapsible "Sommaire" with a square marker appears at the top; articles become a single 680px centred column and margin notes drop below the text. Under 640px the running head drops the measure number, two-column lists stack, the relevé narrows to 20 marks per row, and the register table becomes one block per measurement with labels on the left. In print the head is static and the rail hidden.

## Elevation & Depth

Entirely flat. Depth is conveyed by tone (the grey-green rail and specimens against white paper) and by rules: ink rules for structural edges (running head, footer, table header and totals), hairlines for everything else. There is no shadow anywhere.

### Named Rules
**The Paper Rule.** Nothing floats above the page. Separation is a rule or a tonal field, never a shadow or blur.

## Shapes

Square by default. The only radius is a 2px hairline softening on rail links, inline code and margin-note highlights; the focus ring is 2px solid tampon with 3px offset. The recurring silhouette is the 9 to 11px square mark with a 1.5px ink border, used in the relevé, its legend, the rail (current entry filled) and the mobile contents toggle (filled when open).

## Components

### Running head
- **Style:** sticky, 44px, paper background, ink bottom rule, sans 13px 500 tabular; three-column grid (brand, measure number, date).
- **Mobile:** two columns, measure number hidden.

### Contents rail (Navigation)
- **Style:** grey-green field with hairline right border; each entry shows a grey 12px article number above a 14px sans title, with a hollow square mark at left.
- **Hover:** 5% ink wash. **Current:** title 600, number and mark in Tampon Violet (mark filled). The mark transitions background and border over 160ms cubic-bezier(.2, .7, .2, 1); none under reduced motion.
- **Mobile:** replaced by a collapsible Sommaire, square marker filled when open, entries in an auto-fill grid separated by hairlines.

### Margin notes
- **Style:** sans 14px grey; the note number in ink 600. Superscript calls in the text are sans 12px 600, underline-free, linking to the note.
- **Target:** the targeted note takes the Tampon Wash background and ink text, transitioning over 160ms.

### Relevé (signature)
- A grid of 11px square marks, 4px gap, 35 per row (20 on mobile), one mark per measured site: filled, hatched or hollow by state, with a sans legend carrying ink tabular counts. Captioned as a numbered figure ("Figure 1").

### Tables
- **Style:** full width, sans 15px tabular, hairline row rules, labels left and values right; header labels 12px 600 grey on an ink rule; indented sub-rows in grey; total rows 600 on an ink rule. Caption numbered ("Tableau 1") in 13px grey above.
- **Register variant:** first three columns left-aligned; stacks into labelled blocks on mobile.

### Ruled definition lists
- Signals and deadlines: hairline-ruled rows, sans 600 term (or tabular date) in a 190px column, serif description.

### Specimen
- File contents in mono on the grey-green field with a hairline border, hanging indent for wrapped lines.

### Links
- Inherit text colour; 1px underline at 0.18em offset in 40% ink, full ink on hover.

## Do's and Don'ts

### Do:
- **Do** publish each finding as a numbered article with a one-sentence finding in the display size, followed by numbered paragraphs.
- **Do** put scope, law and source references in margin notes linked from superscript calls.
- **Do** draw data states as ink marks by shape: filled, hatched, hollow.
- **Do** keep apparatus in sans and argument in serif, with tabular numerals for every comparable number.
- **Do** separate sections with hairlines and structural edges with ink rules.
- **Do** keep both light and dark palettes in step; the dark tampon is the lighter violet.

### Don't:
- **Don't** use Tampon Violet for links, headings, chart fills or decoration; it marks only the headline figure and the reader's place.
- **Don't** add stat cards, big-number tiles, dashboards, shadows or a dark "cyber" look.
- **Don't** load web fonts; system faces only.
- **Don't** use status colours (red/green) for states.
- **Don't** borrow institutional identity: no EU emblem, no "Journal officiel" wording; "indépendant" stays in the running head.
- **Don't** round corners beyond 2px.
