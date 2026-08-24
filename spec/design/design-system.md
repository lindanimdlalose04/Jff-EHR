# JFF EHR design system: Clinical Blue

Decided 18 August 2026, after the artefact was judged to look generated rather than
designed. This document is the authority for the interface. Where it disagrees with
what is currently in the code, this document wins and the code is wrong.

Reference mockups: the four screens and the three home candidates, published as an
artifact. Selected home layout: **Report** (option 4A). Options 4B and 4C were built,
compared and not selected; they are kept as evidence of alternatives considered.

No em dashes anywhere. UK and South African spelling.

## 1. Why the previous look failed

Recorded because it is a finding, not just a complaint.

- **The typeface was never loaded.** `theme.css` declared `font-family: "Inter"` with
  no `@font-face`, no link tag, no package and no font file anywhere in the project.
  Every screen has really been rendering in Segoe UI, the Windows default. The app
  was wearing the operating system's clothes.
- **There was no type scale.** Twelve sizes between 10.5px and 14px, including
  half-pixel values, with 122 uses of 12.5px and 72 of 11.5px. Nothing was ever large,
  so no screen had a focal point and hierarchy fell to grey text.
- **The palette was the generated default.** Cream page, warm beige greys, one muted
  jewel-tone accent. Tasteful because it is the average of a million tasteful things.
- **One container repeated everywhere.** Fifty-four rounded cards and fifty-two rounded
  controls, all 8px radius on a hairline border, so nothing was denser or heavier than
  anything else and the interface never signalled what mattered.
- **The skeleton was a dashboard starter.** Icon sidebar, avatar top right, centred
  card column. Nothing said health record, camp, or child.
- **The density was wrong for the work.** 12.5px and airy, which suits a seated reader,
  not a nurse standing at a table with a queue of children.

The root cause: screens were generated one after another with a safe default each time,
and the defaults were then written into a token file with names like `--accent-tint`.
Naming a colour is not choosing one. There was never an art direction.

## 2. Where the new look comes from

- **OpenEMR** contributes the tab strip over a record, the two-column label and value
  grid, and the complete absence of shadows and decorative icons.
- **cityEHR** (Seven Informatics, the Chelsom and Dogar work) contributes the
  form-driven record split into clinical sections.
- **The pinned patient banner** carrying identifiers and allergy flags is the standing
  convention in hospital systems.
- **openEHR** is a data specification, not an interface, so it shapes how the record is
  structured, not how it looks.

## 3. Non-negotiable rules

1. **No shadows.** Not on cards, buttons, menus or modals. Depth comes from rules.
2. **No radius.** `--radius: 0px`, and `borderRadius.card` becomes `0px`. Square.
3. **No decorative icons.** The left nav is text. Icons appear only where they carry
   meaning that a word cannot.
4. **Blue is chrome only.** Top bar, tab strip, section headings, primary buttons,
   links. Blue never means good.
5. **Status is never colour alone.** Every chip, cell and segment carries a word or a
   number as well as its colour.
6. **Anything that lines up in a column is monospaced** with tabular figures:
   identifiers, dates, times, doses, counts.
7. **Rules, not tints, do the separating.** One-pixel `--border-card` between regions.
8. **Empty space is allowed.** If a panel would add nothing, leave the space.

## 4. Type scale

Six steps. Nothing else. Replace all twelve ad hoc sizes with these.

| Step | Size | Weight | Used for |
|---|---|---|---|
| `xs` | 11px | 700, uppercase, 0.06em tracking | table headers, section labels, chips |
| `sm` | 12px | 400 or 600 | hints, captions, meta lines |
| `base` | 13px | 400 | table cells, field values, body |
| `md` | 15px | 600 or 700 | panel titles, top bar brand |
| `lg` | 18px | 700 | banner name, page title |
| `xl` | 22px+ | 700, -0.02em tracking | hero figures and stat numbers only |

The hero figure on the home page is the one deliberate exception at 58px. It is the
only element on any screen allowed to be that large.

## 5. The six shared parts

Everything is built from these. A new screen composes them; it does not invent.

1. **Banner.** Pinned identity strip. Camper name as `SURNAME, First`, then a meta line
   of identifiers, then status flags right-aligned. On camp screens it carries the camp
   and the day counter instead.
2. **Tab strip.** Solid `--accent`, white active tab, one tab per record section.
3. **Label and value grid.** Four columns: label, value, label, value. Labels
   `--text-secondary` at 12px semibold, values 13px. Required fields marked with a red
   asterisk. Full-width rows span columns two to four.
4. **Data table.** `--header-tint` header, uppercase 11px headers, 13px cells, one-pixel
   `--divider` rows, alternating `#FAFCFD` tint. Never a card per row.
5. **Status chip.** 11px bold, one-pixel border, tinted fill, always a word.
   Success, warning, danger, neutral.
6. **Toolbar.** Search, filters, a right-aligned count and a primary action, on a
   `--divider` base above a table.

## 6. Colour was validated, not chosen by eye

This matters clinically and is worth stating in the write-up.

The first status palette failed. Green `#5C9E6B` against amber `#C08A2E` measured a
perceptual separation of ΔE 13.9 for normal vision, below the floor of 15, and 6.6
under protanopia. Given and due sit adjacent in the medication grid, so a colour-blind
nurse could have confused a dose that was given with one still due.

The palette was re-stepped to green `#1B7A4B`, amber `#C97A04`, red `#B01E1E`, which
passes every check: ΔE 8.9 protan, 19.6 normal vision, and all three at or above 3:1
contrast against white. Chip text was separately checked for WCAG contrast and ranges
from 5.6:1 to 7.9:1.

**Inside charts, where colour is the encoding rather than a label, green is not used
at all.** Green against red measures ΔE 5.8 under deuteranopia, well under the floor.
Charts use blue `#1F6FA8`, amber `#C97A04` and red `#B01E1E`, which measure 16.1 and
pass. Green stays on chips, where the word carries the meaning.

## 7. What has to change in the code

| Change | Where | Size |
|---|---|---|
| Replace token values | `src/styles/theme.css` from `spec/design/theme-clinical-blue.css` | small, recolours everything |
| `borderRadius.card` 12px to 0px | `tailwind.config.ts` | one line |
| Add success and chart tokens to the theme | `tailwind.config.ts` colors block | small |
| Remove every `shadow-*` | components | small, two files |
| Move twelve ad hoc sizes onto the six-step scale | all components | the real work |
| Replace icon nav with text nav | `app/app-layout.tsx` | small |
| Introduce banner and tab strip parts | new shared components | medium |
| Rebuild screens onto the parts | camper record, roster, medication grid first | largest |

The token swap alone changes the entire palette without touching a component, because
every colour already flows through `hsl(var(--x))` in the Tailwind config. That makes
the first step cheap and reversible, and it is the recommended place to start.

## 8. Screen order for the rebuild

Value is concentrated in three screens. Do these first, then the rest follow the parts.

1. Camper record (banner, tabs, label and value grid)
2. Camp roster (toolbar, data table, chips)
3. Medication grid (the matrix, which should look like the paper it replaces)
4. Home, Report layout (hero figure, column chart, exceptions table)
5. Everything else
