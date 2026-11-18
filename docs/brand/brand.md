# CTM brand: palette, type and Pip

*Card U2, 2026-11-17. For the console (U1), the demo video (U3) and anything else people see. It builds on the CTM site's brand rather than starting a second one.*

## Name and words

- **CTM** is the product. **Context Ledger** is the name of this repository and of the MCP server (`context-ledger`); use it when talking about the local tool itself.
- Write short, plain sentences. Say what a thing does and what it cannot do.
- Keep the agreed wording (from the product fact sheet): "5× fewer tokens" or "96% smaller handoff", never "96% cheaper"; "they move conversations, we move evidence".

## Palette

The three brand colours are the CTM site's, from its `src/styles/tokens.css`: **Deep Charcoal**, **Electric Violet** and **Acid Lime**, with **Paper** as the light ground. [tokens.css](tokens.css) holds them as CSS custom properties, with a light set for the console and a dark set matching the site.

| Role | Light (console) | Dark (site, video) |
| --- | --- | --- |
| Background | Paper `#f4f3f7` | Charcoal `#18181c` |
| Surface | `#ffffff` | `#222228` |
| Text | Charcoal `#18181c` (16.0:1) | Paper `#f4f3f7` (16.0:1) |
| Secondary text | `#56535e` (6.8:1) | `#b7b4c0` |
| Primary (links, buttons) | Violet `#723bfa` (5.1:1); white text on it 5.6:1 | Soft violet `#9e7bff` (5.7:1) |
| Accent | Lime `#b9f500`, as a fill or mark only | Lime `#b9f500` (13.6:1) |

Ratios are WCAG contrast against the background in that column; [the test](../../tests/brand.test.mjs) checks every pair, including the dark secondary text. **Lime never sits under white text** (1.3:1), the site's own rule. Use Charcoal text on lime (13.6:1).

## Marks and states

The console shows two kinds of state. They get their own colours so that colour is never the only signal; each also has a word or shape.

| State | Light | Dark | Also shown as |
| --- | --- | --- | --- |
| Quoted node (G7) | `#1b6e46` on `#e3f4ea` | `#7ccf8f` | the word "quoted" |
| Inferred node (G7) | `#8a4f00` on `#fbeed9` | `#f2b049` | the word "inferred" |
| Agent working | Violet | Soft violet | Pip's working pose |
| Agent waiting | `#8a4f00` | `#f2b049` | Pip's waiting pose, a question bubble |
| Agent idle | `#56535e` | `#b7b4c0` | Pip's idle pose |

## Type

- **Inter Tight**, the site's typeface, for headings and text where it is available.
- The console has no build step and its content security policy loads nothing from outside, so it does not fetch web fonts. Its stack, `--ctm-font-sans`, falls back to the system sans serif: Inter Tight if installed, then Inter, then the system font.
- Code, IDs and cited line numbers (`L26`) use the system monospace stack, `--ctm-font-mono`.

## Pip

Pip keeps the ledger: a round violet character with the lime spark of the CTM mark as a crest, carrying a citation tag. It is original to CTM.

| Idle | Working | Waiting |
| --- | --- | --- |
| ![Pip idle](pip.svg) | ![Pip working](pip-working.svg) | ![Pip waiting](pip-waiting.svg) |
| Eyes open, holding a citation tag | Eyes down, writing on the tag; the crest lit | Eyes up at a question bubble; the crest dimmed |

- **Where it goes:** one Pip per agent in the console's office, in the pose of that agent's state, replacing U1's placeholder figure. Also the video's opening and closing frames, and the site's empty states.
- **Keep:** the violet body, the paper belly, the lime crest, the tag. Pip works on Paper and on Charcoal without changes.
- **Do not:** turn Pip into an animal from another brand, add a capybara or manga styling (Capy's look is theirs; the console direction takes only its warmth), recolour the body, or stretch it. At 24 px or smaller, use the CTM mark instead.
- **Files:** plain SVG, about 2 KB each, with a title for screen readers and no scripts, no outside links and no embedded fonts, so the console can serve them under its content security policy.

## What this card does not do

- Put Pip into the console. U1 (PR #22) is in review, and its office module draws the figures. Once U1 is merged, swap its placeholder for these three SVGs by state; that is a small follow-up in U1's files.
- A logo change. The CTM mark stays as the site has it.
