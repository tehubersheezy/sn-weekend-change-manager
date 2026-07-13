---
version: alpha
name: Claude-design-analysis
description: A warm-canvas editorial interface for Anthropic's Claude product. The system anchors on a tinted cream canvas with serif display headlines, warm coral CTAs, and dark navy product surfaces (code editor mockups, model showcase cards). Brand voltage comes from the cream/coral pairing — deliberately warm and humanist where most AI brands use cool blue + slate. Type voice runs a slab-serif display ("Copernicus" / Tiempos Headline) for h1/h2 and a humanist sans for body. The signature Anthropic black-radial-spike mark anchors the wordmark.

colors:
  primary: "#cc785c"
  primary-active: "#a9583e"
  primary-disabled: "#e6dfd8"
  primary-ink: "#a9583e"
  ink: "#141413"
  body: "#3d3d3a"
  body-strong: "#252523"
  # Extraction value is #6c6a64. That clears AA on the canvas floor (5.1:1) — the
  # only surface a marketing page sets secondary text on — but lands at 4.48:1 on
  # surface-card, which this console uses for every selected row and active tab.
  # One imperceptible step down clears 4.5:1 on canvas, surface-soft and card.
  muted: "#67655f"
  muted-soft: "#8e8b82"
  hairline: "#e6dfd8"
  hairline-soft: "#ebe6df"
  canvas: "#faf9f5"
  surface-soft: "#f5f0e8"
  surface-card: "#efe9de"
  surface-cream-strong: "#e8e0d2"
  surface-dark: "#181715"
  surface-dark-elevated: "#252320"
  surface-dark-soft: "#1f1e1b"
  on-primary: "#ffffff"
  on-dark: "#faf9f5"
  on-dark-soft: "#a09d96"
  accent-teal: "#5db8a6"
  accent-amber: "#e8a55a"
  success: "#5db872"
  warning: "#d4a017"
  error: "#c64545"
  # Text steps. Every hue above is a FILL; its -ink step is that hue as TYPE.
  # A label painted in its own fill hue over its own tint measures 1.8-2.1:1.
  # See Colors > Semantic.
  success-ink: "#256e33"
  warning-ink: "#7d5c0c"
  error-ink: "#8f2f2f"
  teal-ink: "#0b6e5a"
  amber-ink: "#8f4a15"

  # THE WARM TIER — hover. An amendment (2026-07, owner's instruction): this doc
  # used to forbid hover states entirely; it no longer does. Hover is CHROMATIC —
  # the element under the cursor leans toward the brand coral (OKLCH hue ~40) by
  # one whisper. Never a grey darken, never an opacity change. Selection lives in
  # the cream ladder (H ~83, yellow-warm); hover leans peach (the coral
  # direction) — "where you are" and "where the cursor is" are different hues.
  # See Interaction: Hover & Motion for the grammar and the numbers.
  hover-ink: "#482c22"       # interactive TYPE under the cursor — ink pulled 35% toward primary-ink; 12.0:1 on canvas
  hover-surface: "#f6efe9"   # the wash on unfilled clickables — canvas + 8% coral; muted stays 5.1:1 on it
  hover-hairline: "#e0c5b9"  # the warmed edge on outlined clickables — hairline + 25% coral
  hover-primary: "#bb684d"   # the coral fill's hover — halfway to primary-active; white on it 4.0:1

  # FOREIGN RECORDS. The one blue in the system, and the only hue admitted since
  # the extraction. It does not mean accent, link, info or done. It means exactly
  # one thing: this record does not live in ServiceNow. Blue is PAPER, not INK.
  # The Don'ts still forbid cool blue as a brand accent — provenance is not an
  # accent. See Foreign Records for the derivation, the boundary rules and the
  # numbers.
  #
  # Note the family breaks the fill/ink pattern: it has ONLY an ink. WCAG luminance
  # is 71% green / 21% red / 7% blue, so a blue at coral's exact perceptual
  # lightness measures 2.96:1 where coral measures 3.11:1 — under the 3:1 shape
  # floor. A blue that clears 3:1 is darker than every other fill here, which
  # collapses it into its own ink step. One chromatic token is all that can pass.
  jira-ink: "#3465a5"
  jira-canvas: "#f2f8ff"
  jira-card: "#deeafb"
  jira-hairline: "#c3d7f2"
  # The boundary object's hover. Stays INSIDE the blue family (warming a Jira
  # chip toward coral would repaint provenance as emphasis) and lives in the
  # EDGE, not the fill — jira-ink on any usefully-deeper fill drops under 4.5:1
  # (4.17 at the gentlest perceptible step). jira-hairline pulled 25% toward
  # jira-ink; press firms the edge the rest of the way to jira-ink itself.
  jira-hairline-hover: "#9fbbdf"
  jira-on: "#f2f8ff"

typography:
  display-xl:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  display-xs:
    fontFamily: "Copernicus, Tiempos Headline, serif"
    fontSize: 22px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: -0.2px
  title-lg:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  # NOT ADOPTED. This product ships no monospace anywhere — record numbers, IDs,
  # timestamps and plan text all take the sans stack. Retained only to document
  # the claude.com extraction. Never emit it. See Typography > Monospace.
  code:
    fontFamily: "JetBrains Mono, ui-monospace, monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  button:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-link:
    fontFamily: "StyreneB, Inter, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  xs: 4px
  sm: 6px
  md: 8px
  lg: 12px
  xl: 16px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 96px

# This console's addition, not claude.com's (the extraction shipped no motion —
# see Known Gaps). One curve, three time bands. Implemented as theme.css
# --animate-* tokens + Tailwind's default transition settings, so every
# transition-colors in the app shares the curve with nothing at the call site.
# See Interaction: Hover & Motion.
motion:
  ease: "cubic-bezier(0.25, 1, 0.5, 1)"  # ease-out-quart — the only curve; no bounce, no elastic
  duration-state: 150ms      # hover / press / focus colour glides; crossfades (fade-in)
  duration-entrance: 220ms   # content arrival (rise-in: fade + 4px rise)
  duration-open: 200ms       # dialog open — exits run ~75% (150ms)
  stagger: 20ms              # list-row entrance step, capped at 12 rows (240ms ceiling)
  # THE ONE AMBIENT LOOP (amendment 2026-07, owner's instruction): the AI report's
  # thinking state. It is the sole `linear` timing and the sole infinite animation
  # in the system, and both departures are deliberate — an eased loop stutters at
  # its own seam, and a model that reports no progress can only be expressed as
  # indeterminate. Bound to the headline that states the wait, so it conveys state
  # rather than decorating one. Not a precedent; see Interaction: Hover & Motion >
  # The ambient loop.
  ease-ambient: "linear"
  duration-ambient: 3600ms

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  button-primary-hover:
    backgroundColor: "{colors.hover-primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    height: 40px
  # The outlined pattern: edge and fill warm together. Press deepens to
  # {colors.surface-card} — surface-soft as a press is indistinguishable from
  # this hover wash.
  button-secondary-hover:
    backgroundColor: "{colors.hover-surface}"
    borderColor: "{colors.hover-hairline}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  button-secondary-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  button-text-link:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.button}"
  button-icon-circular:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 36px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary-ink}"
    typography: "{typography.body-md}"
  # Every interactive word — ink, muted or coral at rest — converges on
  # {colors.hover-ink} under the cursor: one warm voice for "this will act".
  # Underline stays the press state.
  text-link-hover:
    backgroundColor: transparent
    textColor: "{colors.hover-ink}"
  top-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    height: 64px
  hero-band:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-xl}"
    padding: 96px
  hero-illustration-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
  feature-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  product-mockup-card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  # NOT ADOPTED — depends on {typography.code}. No analog in this console.
  code-window-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.code}"
    rounded: "{rounded.lg}"
    padding: 24px
  model-comparison-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  pricing-tier-card-featured:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-lg}"
    rounded: "{rounded.lg}"
    padding: 32px
  callout-card-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 32px
  connector-tile:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    height: 40px
  text-input-focused:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  cookie-consent-card:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  category-tab:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.nav-link}"
    padding: 8px 14px
    rounded: "{rounded.md}"
  # Inactive tabs only. The active tab is already home in {colors.surface-card}
  # and does not warm — hover marks a move you could make, not where you are.
  category-tab-hover:
    backgroundColor: "{colors.hover-surface}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  category-tab-active:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.caption-uppercase}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-status:
    backgroundColor: "{colors.success} | {colors.warning} | {colors.error} | {colors.accent-teal} | {colors.accent-amber} at 15% alpha"
    textColor: "{colors.success-ink} | {colors.warning-ink} | {colors.error-ink} | {colors.teal-ink} | {colors.amber-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  # The offset colour is the SURFACE THE ELEMENT SITS ON — not always the canvas.
  # Canvas was simply the only surface the marketing site had. On a foreign-record
  # pane the offset is {colors.jira-canvas}; a cream offset there is a visible cream
  # halo. See Focus State.
  focus-ring:
    borderColor: "{colors.primary}"
    borderWidth: 2px
    offset: 2px
    offsetColor: "{colors.canvas} | {colors.jira-canvas} — whichever surface the element is on"

  # --- Foreign records (Jira). See Foreign Records. -------------------------
  # The pane floor. The tint IS the provenance statement; nothing else on the
  # surface needs to shout. Never used for a native record.
  jira-surface:
    backgroundColor: "{colors.jira-canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    padding: "{spacing.xl}"
  # The boundary object: a Jira key rendered inside a NATIVE surface (a feed line,
  # a Jiras-tab row). Tight padding — it is an identifier, not a badge. It always
  # carries its own border: an object that crosses a boundary brings its own edge.
  # (On a selected surface-card row the fill alone measures 1.007:1 and vanishes.)
  jira-key-chip:
    backgroundColor: "{colors.jira-card}"
    borderColor: "{colors.jira-hairline}"
    borderWidth: 1px
    textColor: "{colors.jira-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 1px 6px
    fontFeature: tabular-nums
  # When the chip is a LINK (JiraLink), its hover firms the EDGE within the blue
  # family; fill and ink never move (fill: contrast arithmetic; toward coral:
  # provenance is not emphasis). Press takes the border to {colors.jira-ink}.
  # Display-only chips (a task row naming its key) have no hover.
  jira-key-chip-hover:
    backgroundColor: "{colors.jira-card}"
    borderColor: "{colors.jira-hairline-hover}"
    borderWidth: 1px
    textColor: "{colors.jira-ink}"
    rounded: "{rounded.xs}"
  # Jira status category. ServiceNow badges are PILLS; Jira badges are STAMPS
  # ({rounded.xs}). One hue, three ink densities — hollow -> tinted -> solid. The
  # ladder is lightness, not hue, so it survives CVD and greyscale. A Jira "Done"
  # (solid blue square) cannot be mistaken for a ServiceNow "Closed" (tinted green
  # pill): shape, hue and fill density all differ.
  jira-stamp-todo:
    backgroundColor: transparent
    borderColor: "{colors.jira-hairline}"
    borderWidth: 1px
    textColor: "{colors.jira-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 4px 12px
  jira-stamp-progress:
    backgroundColor: "{colors.jira-card}"
    textColor: "{colors.jira-ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 4px 12px
  jira-stamp-done:
    backgroundColor: "{colors.jira-ink}"
    textColor: "{colors.jira-on}"
    typography: "{typography.caption}"
    rounded: "{rounded.xs}"
    padding: 4px 12px
  # Issue type and priority. NO chrome — a glyph in the Jira hue, a word in the
  # console's ink. There is exactly one stamp per issue (its status), so the stamp
  # stays a rare, meaningful mark instead of becoming badge soup.
  jira-fact:
    backgroundColor: transparent
    iconColor: "{colors.jira-ink}"
    textColor: "{colors.ink}"
    typography: "{typography.body-sm}"
  # The quiet reference panel on a Jira pane — description, and any long body text.
  # {component.plan-card}'s register, one family over. Never a <pre>.
  jira-panel:
    backgroundColor: "{colors.jira-card}"
    textColor: "{colors.body-text}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  # THE HERO, and the reason the surface exists: the changes and change tasks in
  # THIS console that carry this key. The one CREAM object on the blue pane — a
  # window back into ServiceNow. It needs no decoration to lead: it is the only
  # warm thing on a cool page. Colour-block hierarchy, exactly as the system says.
  # Its rows are native records and take native {component.badge-status} PILLS.
  jira-referenced-by-card:
    backgroundColor: "{colors.canvas}"
    borderColor: "{colors.hairline}"
    borderWidth: 1px
    textColor: "{colors.ink}"
    typography: "{typography.display-xs}"
    rounded: "{rounded.lg}"
  cta-band-coral:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  cta-band-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 64px
  footer:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark-soft}"
    typography: "{typography.body-sm}"
    padding: 64px
---

## Overview

Claude.com is the warmest, most editorial interface in the AI-product category. The base atmosphere is a **tinted cream canvas** (`{colors.canvas}` — #faf9f5) — distinctly warm, deliberately not the cool gray-white that every other AI brand uses. Headlines run a **slab-serif display** ("Copernicus" / Tiempos Headline) at weight 400 with negative letter-spacing, paired with **StyreneB / Inter** body sans. The combination feels like a literary publication, not a SaaS marketing page.

Brand voltage comes from the **cream + coral pairing** — coral (`{colors.primary}` — #cc785c) is the signature Anthropic accent, used on every primary CTA, on the brand wordmark, and on full-bleed callout cards. The coral is warm, slightly muted, never cyan/blue — a deliberate counter-positioning against OpenAI's cool slate, Google's saturated blue, and Microsoft's corporate cyan.

The system has three surface modes that alternate page-by-page:
1. **Cream canvas** (`{colors.canvas}`) — default body floor
2. **Light cream cards** (`{colors.surface-card}`) — feature card backgrounds
3. **Dark product surfaces** (`{colors.surface-dark}`) — code editor mockups, model showcase cards, pre-footer CTAs, footer itself. (The extraction calls these "navy"; the hex is a *warm charcoal*. See Colors > Surface.)

The dark surfaces are where Claude shows its product chrome — code blocks, terminal output, model comparison tables, agentic-flow diagrams. The cream-to-dark contrast is the page's pacing rhythm.

**Key Characteristics:**
- Warm cream canvas (`{colors.canvas}` — #faf9f5) with dark warm-ink text (`{colors.ink}` — #141413). The brand's defining color choice.
- Coral primary CTA (`{colors.primary}` — #cc785c). Used scarcely on individual buttons, generously on full-bleed coral callout cards.
- Slab-serif display headlines via Copernicus / Tiempos Headline at weight 400 with negative letter-spacing. Pairs with humanist sans body for a literary editorial voice.
- Dark navy product mockup cards (`{colors.surface-dark}` — #181715) carrying code blocks, terminal panels, model comparison data — the brand shows the product chrome at scale rather than abstract marketing illustrations.
- Light cream feature cards (`{colors.surface-card}` — #efe9de) — slightly darker than canvas, used for content-driven feature explanations.
- Anthropic radial-spike mark — a small black asterisk-like glyph (4-spoke radial) — appears as the brand wordmark prefix and as a content marker.
- Border radius is hierarchical: `{rounded.md}` (8px) for buttons + inputs, `{rounded.lg}` (12px) for content + product cards, `{rounded.xl}` (16px) for the hero illustration container, `{rounded.pill}` for badges.
- Section rhythm `{spacing.section}` (96px) — modern-SaaS standard. Internal card padding stays generous at `{spacing.xl}` (32px).

## Colors

### Brand & Accent
- **Coral / Primary** (`{colors.primary}` — #cc785c): The signature Anthropic warm coral. Used on every primary CTA background, on full-bleed coral callout cards, on the brand wordmark accent. The most-recognized Anthropic color outside of the spike-mark logo.
- **Coral Active** (`{colors.primary-active}` — #a9583e): The press variant. Hover stops halfway there (`{colors.hover-primary}` — #bb684d), so a press still reads as a further commitment beyond the hover.
- **Coral Ink** (`{colors.primary-ink}` — #a9583e): Coral as *type*. Same hex as the press variant, named for its role. `{colors.primary}` is a fill: 3.1:1 on cream, fine behind white button type, an AA failure as type. Any coral word — inline link, text button — uses this.
- **Coral Disabled** (`{colors.primary-disabled}` — #e6dfd8): A desaturated cream-tinted disabled state.
- **Accent Teal** (`{colors.accent-teal}` — #5db8a6): Used sparingly on secondary product surfaces (terminal status indicators, "active connection" dots in connectors page).
- **Accent Amber** (`{colors.accent-amber}` — #e8a55a): A small companion warm-tone used on category badges and inline highlights.

### Surface
- **Canvas** (`{colors.canvas}` — #faf9f5): The default page floor. Tinted cream — warm, deliberately not pure white.
- **Surface Soft** (`{colors.surface-soft}` — #f5f0e8): Section dividers, very-soft band backgrounds.
- **Surface Card** (`{colors.surface-card}` — #efe9de): Feature cards, content cards. One step darker than canvas.
- **Surface Cream Strong** (`{colors.surface-cream-strong}` — #e8e0d2): A strongest-cream variant used on selected category tabs and emphasized section bands.
- **Surface Dark** (`{colors.surface-dark}` — #181715): Code editor mockups, model showcase cards, footer. The dominant dark surface. **It is not navy.** This doc calls it "dark navy" in eight places, inherited verbatim from the claude.com extraction; the hex measures OKLCH **H 85, C 0.004** — a *warm, near-neutral charcoal*, the ink colour with the lights off. There is no blue in it and there never was. The remaining "navy" mentions describe marketing surfaces this console does not build (hero illustrations, footer, code windows) and are left as extraction history — but do not reach for a blue-black on their authority. **The system's genuinely cool tones are exactly one family wide, and it is `{colors.jira-ink}` — see Foreign Records.**
- **Surface Dark Elevated** (`{colors.surface-dark-elevated}` — #252320): Elevated cards inside dark bands (settings panels in mockups).
- **Surface Dark Soft** (`{colors.surface-dark-soft}` — #1f1e1b): Slightly lighter dark, used for code block backgrounds inside larger dark cards.
- **Hairline** (`{colors.hairline}` — #e6dfd8): The 1px border tone on cream surfaces. Same hex as `{colors.primary-disabled}` — borders feel like one elevation step rather than ink lines.
- **Hairline Soft** (`{colors.hairline-soft}` — #ebe6df): Barely-visible divider used inside the same band.

### Text
- **Ink** (`{colors.ink}` — #141413): All headlines and primary text. Warm dark, slightly off-pure-black.
- **Body Strong** (`{colors.body-strong}` — #252523): Emphasized paragraphs, lead text.
- **Body** (`{colors.body}` — #3d3d3a): Default running-text color.
- **Muted** (`{colors.muted}` — #67655f): Secondary text — meta lines, timestamps, counts, assignees. **This is the floor for anything a user reads.** Extracted as #6c6a64; darkened one imperceptible step so it also clears 4.5:1 on `{colors.surface-card}`, which this console paints under every selected row and active tab (the marketing surface never did).
- **Muted Soft** (`{colors.muted-soft}` — #8e8b82): **Decoration only — never running text.** 3.2:1 on cream: it clears the 3:1 bar for glyphs and shapes and fails AA for type. Use it for icon tints, the `·` between links, the `→` in a date range, input placeholders, an offline dot. The moment it is carrying a word someone has to *read* — a name, a time, a status, a count — it is the wrong token and `{colors.muted}` is the right one. The extraction called this "captions, fine-print, copyright lines"; a console has no fine print.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on coral buttons.
- **On Dark** (`{colors.on-dark}` — #faf9f5): Cream-tinted white used on dark surfaces (echoes the canvas tone).
- **On Dark Soft** (`{colors.on-dark-soft}` — #a09d96): Footer body text, secondary labels in dark mockups.

### Semantic
- **Success** (`{colors.success}` — #5db872): Green status dots, "available" indicators.
- **Warning** (`{colors.warning}` — #d4a017): Warning callouts (rare on marketing surfaces).
- **Error** (`{colors.error}` — #c64545): Validation errors.

**The five semantic hues above are FILLS, not text colors.** They were extracted as status *dots* — shapes, not type — and they do not survive being used as both fill and label. A tinted pill (the hue at 15% alpha) with its label painted in the same hue measures **1.8–2.1:1** (error, the darkest, still only reaches 3.7:1). At 13px that is unreadable, and the status pill is the primary indicator on every card in this console.

Text on a tinted pill takes the deeper same-family **`-ink`** step:

| Fill (hue at 15%) | Label | On canvas | On a selected `{colors.surface-card}` row |
|---|---|---|---|
| `{colors.success}` | `{colors.success-ink}` — #256e33 | 5.3:1 | 4.7:1 |
| `{colors.warning}` | `{colors.warning-ink}` — #7d5c0c | 5.2:1 | 4.6:1 |
| `{colors.error}` | `{colors.error-ink}` — #8f2f2f | 6.2:1 | 5.5:1 |
| `{colors.accent-teal}` | `{colors.teal-ink}` — #0b6e5a | 5.3:1 | 4.7:1 |
| `{colors.accent-amber}` | `{colors.amber-ink}` — #8f4a15 | 5.7:1 | 5.1:1 |

The selected-row case is the tighter one — a tinted pill sitting on an already-tinted row — and it is the one to check when adding a sixth status.

`{colors.amber-ink}` is pulled toward rust rather than taken straight down its own hue. Deepened in place, `{colors.accent-amber}` lands within a few degrees of `{colors.warning-ink}`'s golden olive — and Review (amber) can sit beside an unsuccessful outcome (warning) on the same card, so the two have to stay tellable apart. 16° of hue separation buys that. When deriving a new `-ink`, check it against the *other* inks, not just its own fill.

**The rule generalizes: the light hue is the colour as a FILL or a SHAPE; the `-ink` step is the colour as TYPE — on any surface, not only on its own tint.** A status dot, a chart bar, a 1px rule or a button fill takes the light hue. A word takes the `-ink`. An error message on the bare cream canvas is still type, so it is `{colors.error-ink}`, not `{colors.error}` — even though `{colors.error}` happens to scrape 4.6:1 there. Consistency of *rule* beats a per-case contrast audit, and it means nobody has to relitigate this at each call site.

**Coral obeys the same split.** `{colors.primary}` is a fill — it measures **3.1:1** on cream, which is fine behind white button type and an AA failure as type itself. So the extraction's `{component.text-link}` (an inline coral link) is not usable as written: coral *type* takes `{colors.primary-ink}` (#a9583e, 4.8:1). It carries the same hex as `{colors.primary-active}` deliberately, and is named for its role — a reader should not have to wonder why a link at rest is painted in the press colour.

**One hue has no fill, and the exception teaches the rule.** `{colors.jira-ink}` (foreign records) ships *only* as an ink. WCAG relative luminance is 71% green / 21% red / 7% blue, so a blue reads far darker to the formula than it looks to the eye: a blue at coral's exact perceptual lightness measures **2.96:1** on cream where coral measures **3.11:1** — below the 3:1 floor that makes a light hue usable as a shape at all. Clearing 3:1 forces a blue *darker than every fill in this palette*, which lands it on top of its own ink step. So the fill/ink split isn't a law of the system; it is a law of hues bright enough to have two usable steps, and blues are not. Any future cool hue will hit the same wall — check the 3:1 floor **before** assuming you get a fill. See Foreign Records.

The timeline's bar palette is separately dataviz-validated (see `TimelineView.tsx`) — those bars are shapes, and their hexes are not `-ink` steps. Do not swap them without re-running the validator.

## Typography

### Font Family
The system runs **Copernicus** (or **Tiempos Headline** as substitute) as the slab-serif display face for headlines, and **StyreneB** (or **Inter** as substitute) as the humanist sans for body, navigation, and UI labels. The fallback stack walks `Tiempos Headline, Garamond, "Times New Roman", serif` for display and `Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` for body. There is no third face — see Monospace below.

The display/body split is editorial:
- Copernicus serif (weight 400, negative tracking) → h1, h2, h3, display headlines, stat numerals
- StyreneB sans (weight 400-500) → everything else: body, navigation, buttons, captions, labels, and all record numbers, IDs, timestamps and plan text

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | Homepage h1 ("Meet your thinking partner") — Copernicus serif |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | Section heads — Copernicus |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | Sub-section heads, model names — Copernicus |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | Pricing tier names, callout headlines — Copernicus |
| `{typography.display-xs}` | 22px | 400 | 1.25 | -0.2px | The console's smallest serif step: dialog titles, stat numerals, wordmark — Copernicus |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | Pricing plan size labels — StyreneB |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | Feature card titles, intro paragraphs |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | Connector tile titles, list labels |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | Default running-text — StyreneB |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | Footer body, fine-print |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | Badge labels, captions |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | Category tags, "NEW" badges |
| `{typography.code}` | 14px | 400 | 1.6 | 0 | **NOT ADOPTED** — see Monospace |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | Standard button labels |
| `{typography.nav-link}` | 14px | 500 | 1.4 | 0 | Top-nav menu items |

The scale is the whole scale. A size that isn't on it (11px, 19px, 24px) is a bug, not a decision — those three all crept into this console before the scale was encoded as tokens. Size, line-height and letter-spacing travel together as one token; never re-tune tracking by hand.

### Note on `display-xs`

`display-xs` (22px serif) is this product's addition, not claude.com's. The extracted display scale bottoms out at 28px because it was pulled from a marketing page, where the smallest serif moment is still a pricing headline. A dense operational console needs one step below that — and the app proved it by inventing three unsanctioned sizes to fill the gap (a 19px wordmark, 22px stat numerals, and a 22px section heading with a made-up -0.2px tracking).

Serif numerals are already blessed by the system — `{component.pricing-tier-card}` sets its *price* in `{typography.display-sm}` (Copernicus serif) — so serif stat values are on-brand. They simply had no token. Three invented sizes collapse into one documented step.

Note it collides in size with `{typography.title-lg}` (22px) and that is intended: the two are the serif and the sans voice at the same size. `display-xs` is a *headline* at 22px; `title-lg` is a *label* at 22px.

### Monospace

**This product uses no monospace. There is no mono face in the system.**

`{typography.code}` and `{component.code-window-card}` are inherited from the claude.com extraction — a marketing site that shows code editor mockups as product chrome. This console has no such surface, and the owner rejects mono type in all circumstances. Both entries are retained above only to document what was extracted; **neither is adopted, and neither may be emitted.**

Record numbers (CHG0030001), sys_ids, timestamps, durations, Jira keys, diffs, and implementation / backout / test plan bodies all set in the sans stack. When digits need to align in a column, use the `tabular-nums` font feature on the sans face — that is the correct tool, and it is not a different font.

One implementation note, because it bites silently: Tailwind's preflight applies a mono family to every `<code>`, `<kbd>`, `<samp>` and `<pre>` with no class involved, deriving it from the `--font-mono` theme variable. **Deleting that variable does not help** — preflight falls back to its own `ui-monospace` stack. So `--font-mono` is deliberately aimed at the sans stack in `theme.css`. It is not a copy-paste error; do not "clean up the duplication." Prefer `<div>` with `whitespace-pre-wrap` over `<pre>` regardless.

### Principles
Display sizes use weight 400 (regular), never bold. Negative letter-spacing (-0.3 to -1.5px) is essential — Copernicus without it reads as off-brand. The serif character is what gives Anthropic its literary, considered voice; switching to a sans-serif display would make Claude feel like every other AI tool.

Body type stays at weight 400 for paragraphs, weight 500 for labels and emphasized phrases. The sans body is humanist (StyreneB) — never geometric. Inter is an acceptable substitute because of its similar humanist proportions; Helvetica or Arial would be too neutral and break the warm-editorial feel.

### Note on Font Substitutes
If Copernicus / Tiempos Headline is unavailable, **Cormorant Garamond** at weight 500 with -0.02em letter-spacing is the closest open-source approximation. **EB Garamond** is a fallback. For StyreneB, **Inter** is the closest match — both are humanist sans designed for screen reading. **Söhne** is another close alternative if licensed.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 96px.
- **Section padding:** `{spacing.section}` (96px) — modern-SaaS rhythm.
- **Card internal padding:** `{spacing.xl}` (32px) for feature cards, pricing tier cards, model comparison cards; `{spacing.lg}` (24px) for code-window cards and connector tiles.
- **Callout / CTA bands:** `{spacing.xxl}` (48px) inside coral callout cards; 64px inside the larger dark CTA band.

### Grid & Container
- **Max content width:** ~1200px centered.
- **Editorial body:** Single 12-column grid; hero often uses 6/6 split (h1 left, illustration right).
- **Feature card grids:** 3-up at desktop, 2-up at tablet, 1-up at mobile.
- **Connector tile grids:** 4-up or 6-up at desktop, 2-up at tablet, 1-up at mobile.
- **Pricing grid:** 3-up at desktop (Free / Pro / Team / Enterprise often), 1-up at mobile.

### Whitespace Philosophy
The cream canvas + serif display + generous internal padding create an editorial pacing — Claude reads like a long-form magazine column rather than a marketing template. Whitespace between bands stays uniform at 96px; whitespace inside cards is generous (32px), letting type breathe.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, top nav, hero bands |
| Soft hairline | 1px `{colors.hairline}` border | Inputs, sub-nav, occasionally on cards |
| Cream card | `{colors.surface-card}` background — no shadow | Feature cards, content cards |
| Dark surface card | `{colors.surface-dark}` background — no shadow | Code editor mockups, model showcase cards |
| Subtle drop shadow | `0 1px 3px rgba(20,20,19,0.08)` | The one sanctioned elevation, used rarely. It is a named token (`shadow-hairline`) — never inline the rgba. |

The elevation philosophy is **color-block first, shadow rare**. Most depth comes from the cream-vs-dark surface contrast. Shadows are minimal. The dark surface mockups have their own internal product chrome (code editor scrollbars, line numbers, syntax highlighting) which adds detail without needing external shadows.

### Decorative Depth
- The Anthropic spike-mark glyph (4-spoke radial asterisk) appears as a small black mark in the brand wordmark and inline as a content marker.
- Code editor mockups carry their own internal depth: syntax-highlighted text in muted blues / oranges / grays, line numbers in `{colors.muted-soft}`, status bars at the bottom in `{colors.surface-dark-elevated}`.
- Some hero illustrations use simple line-art with coral and dark-navy strokes on cream — minimal, hand-drawn-feeling, never photorealistic.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.xs}` | 4px | Reserved for badge accents and tiny dropdowns |
| `{rounded.sm}` | 6px | Small inline buttons, dropdown items |
| `{rounded.md}` | 8px | Standard CTA buttons, text inputs, category tabs |
| `{rounded.lg}` | 12px | Content cards (feature, pricing, code-window, model-comparison) |
| `{rounded.xl}` | 16px | Hero illustration container, the larger marquee components |
| `{rounded.pill}` | 9999px | Badge pills, "NEW" tags |
| `{rounded.full}` | 9999px / 50% | Avatar substitutes, icon buttons |

### Photography & Illustrations
Claude's hero rarely uses photography. Instead it uses:
- Simple line-art illustrations with coral + dark-navy strokes on the cream canvas
- Code editor mockups (the dominant "hero" treatment on developer-focused pages) — **not adopted**
- Terminal output mockups with monospace text on dark — **not adopted**, see Typography > Monospace
- Model comparison cards (Opus / Sonnet / Haiku) with abstract geometric thumbnails

When photography is used (rare — mostly testimonials), avatars crop to perfect circles at 40px diameter.

## Components

### Top Navigation

**`top-nav`** — Cream nav bar pinned to the top of every page. 64px tall, `{colors.canvas}` background. Carries the Anthropic spike-mark + "Claude" wordmark at left, primary horizontal menu (Product, Solutions, Use Cases, Pricing, Research, Company) center-left, right-side cluster with "Sign in" text-link, "Try Claude" `{component.button-primary}` (coral). Menu items in `{typography.nav-link}` (StyreneB 14px / 500).

### Buttons

**`button-primary`** — The signature coral CTA. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), type `{typography.button}` (StyreneB 14px / 500), padding 12px × 20px, height 40px, rounded `{rounded.md}` (8px). Hover deepens to `{colors.hover-primary}` (#bb684d); active state `button-primary-active` darkens the rest of the way to `{colors.primary-active}` (#a9583e).

**`button-secondary`** — Cream button with hairline outline. Background `{colors.canvas}`, text `{colors.ink}`, 1px hairline border, same padding + height + radius as primary.

**`button-secondary-on-dark`** — Used over `{colors.surface-dark}` cards. Background `{colors.surface-dark-elevated}` (#252320), text `{colors.on-dark}`. Stays dark — the system never inverts to a light secondary on dark surfaces.

**`button-text-link`** — Inline text button, no background. Used for "Sign in" in the top nav and inline CTA links.

**`button-icon-circular`** — 36px circular icon button. Background `{colors.canvas}`, hairline border, ink-color icon. Used for carousel arrows, share, "view more".

**`text-link`** — Inline body links in `{colors.primary-ink}` — coral as type, not the fill hue (see Colors > Semantic). Hover warms to `{colors.hover-ink}` (every interactive word converges there); underlined on press. The coral inline link is one of the system's most distinctive small details.

### Cards & Containers

**`hero-band`** — Cream-canvas hero with a 6-6 grid: h1 + sub-headline + button row on the left, hero illustration card or product mockup card on the right. Vertical padding `{spacing.section}` (96px).

**`hero-illustration-card`** — A larger card holding the hero's right-side artifact — sometimes a coral-stroke line illustration on cream background, sometimes a dark code editor mockup. Background `{colors.canvas}` or `{colors.surface-dark}` depending on context, rounded `{rounded.xl}` (16px).

**`feature-card`** — Used in 3-up feature grids. Background `{colors.surface-card}` (#efe9de — slightly darker cream), rounded `{rounded.lg}` (12px), internal padding `{spacing.xl}` (32px). Carries a small icon at top, an `{typography.title-md}` headline, and a body description in `{typography.body-md}`.

**`product-mockup-card-dark`** — Dark navy card showing actual Claude product chrome (chat interface, code editor, agent controls). Background `{colors.surface-dark}`, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries text labels in `{colors.on-dark}` and product UI fragments below.

**`code-window-card`** — A specialized dark card showing a code editor with line numbers, syntax-highlighted code in `{typography.code}` (JetBrains Mono), and sometimes a "Run" button or terminal output panel below. Background `{colors.surface-dark}` with `{colors.surface-dark-soft}` for the inner code block, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). The signature visual element of Claude Code product pages.

**`model-comparison-card`** — Used on the homepage's "Which problem are you up against?" section comparing Opus / Sonnet / Haiku. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, internal padding `{spacing.xl}` (32px). Carries the model name, a short capability blurb, and a `{component.text-link}` to learn more.

**`pricing-tier-card`** — Standard tier card. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding `{spacing.xl}` (32px). Carries the plan name in `{typography.title-lg}` (StyreneB), price in `{typography.display-sm}` (Copernicus serif!), feature checklist in `{typography.body-md}`, and a `{component.button-primary}` at the bottom.

**`pricing-tier-card-featured`** — The featured tier (typically "Pro" or "Team"). Background flips to `{colors.surface-dark}`, text inverts to `{colors.on-dark}`. The dark surface IS the featured-tier signal.

**`callout-card-coral`** — A full-bleed coral card carrying a major call-to-action. Background `{colors.primary}` (#cc785c), text `{colors.on-primary}` (white), rounded `{rounded.lg}`, padding `{spacing.xxl}` (48px). The coral surface IS the voltage; the CTA inside uses an inverted button style (cream/canvas button on coral).

**`connector-tile`** — Used on the connectors page's integration grid. Background `{colors.canvas}` with hairline border, rounded `{rounded.lg}`, padding 20px. Each tile carries a logo at top, a `{typography.title-sm}` connector name, and a short description.

### Inputs & Forms

**`text-input`** — Standard text input. Background `{colors.canvas}`, text `{colors.ink}`, type `{typography.body-md}`, rounded `{rounded.md}` (8px), padding 10px × 14px, height 40px. 1px hairline border in `{colors.hairline}`.

**`text-input-focused`** — Focus state. The border shifts to `{colors.primary}` (coral), and a 3px coral-at-15%-alpha outer ring sits outside it. **The border is the indicator; the ring is only a glow around it.** Read the next section before copying this ring anywhere else — on its own it is invisible.

**`cookie-consent-card`** — Bottom-right floating dark cookie banner. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding `{spacing.lg}` (24px). One of the few places dark surface appears at small scale on cream pages.

### Focus State

**`focus-ring`** — A 2px ring in full-strength `{colors.primary}` (coral), held 2px off the element **in the colour of the surface the element sits on**. One recipe, every interactive element: buttons, tabs, cards-as-buttons, inline links, dialog close. This is the console's only focus treatment.

Focus is not a style choice, and it is not hover: the warm tier (see Interaction: Hover & Motion) marks where the *cursor* is; this ring marks where the *keyboard* is, and the two never substitute for each other. Cards in this console are `<button>`s and the interface is stated to be keyboard-operable, so the indicator is a hard requirement (WCAG 2.4.11 wants ≥ 3:1 against what's adjacent). Full-strength coral on cream is **3.11:1** and clears it. Note the ring's 2px offset band is canvas-coloured, which also means a hover fill can never touch the ring — its contrast is always measured against the canvas.

**The offset colour is a variable, not a constant.** This doc used to pin it to `{colors.canvas}`, and that was only ever true because canvas was the sole surface a marketing page had. The rule is: *the offset takes the colour of whatever the element is sitting on.* Get it wrong and the ring floats on a 2px band of the wrong colour — on `{component.jira-surface}` a cream offset is a visible cream halo on blue paper. Because the offset band and the surface outside the ring are then the same colour, the only contrast that ever matters is **coral against the surface the element sits on**:

| Element sits on | Coral ring | |
|---|---|---|
| `{colors.canvas}` | **3.11:1** | ✅ |
| `{colors.jira-canvas}` | **3.07:1** | ✅ |
| `{colors.surface-card}` | **2.71:1** | ❌ |
| `{colors.jira-card}` | **2.69:1** | ❌ |

The two failures give a rule with teeth: **nothing focusable sits directly on a `*-card` fill.** Focusable objects live on a canvas — `{colors.canvas}` or `{colors.jira-canvas}`. (An active tab is *filled* `{colors.surface-card}` but *sits on* the canvas, so its offset band and its surroundings are both cream and it measures the full 3.11:1. That is the distinction, and it is why the tabs are fine.)

Three things the ring must not be:

- **Not the 15%-alpha coral halo alone.** That halo is **1.16:1** on the cream canvas — literally invisible. It reads as a focus state in `{component.text-input-focused}` only because a *coral border* sits inside it doing the actual work. Every element with no border to flip — a button, a tab, a card, a link — that copied the halo got a focus state you cannot see. This is the single easiest mistake to make in this system.
- **Not offset-less on coral.** A coral ring drawn flush against a coral `{component.button-primary}` is 1.00:1 — it dissolves into the fill. The 2px surface-coloured offset is what separates them, and it restores the full 3.11:1.
- **Not re-tinted to match the surface it lands on.** A *blue* ring on a Jira pane is the tempting mistake, and it is wrong on the merits: focus is the **console's cursor**, not a property of the record under it. A reader tabbing across the ServiceNow/Jira boundary must not have the affordance change under them. The ring is chrome, and chrome stays coral everywhere. Only the offset moves.

### Tags / Badges

**`badge-pill`** — Small pill label used for category tags. Background `{colors.surface-card}`, text `{colors.ink}`, type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-coral`** — Coral-fill badge for "NEW", "BETA", featured highlights. Background `{colors.primary}`, text `{colors.on-primary}`, type `{typography.caption-uppercase}` (12px / 500 / 1.5px tracking), rounded `{rounded.pill}`, padding 4px × 12px.

**`badge-status`** — The tinted status pill, and the workhorse of this console: it is how lifecycle state reads on every card. Fill is one of the five semantic hues at 15% alpha; the label is the matching `-ink` step (never the fill hue — see Colors > Semantic for why, and for the numbers). Type `{typography.caption}` (13px / 500), rounded `{rounded.pill}`, padding 4px × 12px. Status is never carried by color alone: the pill always has a label.

### Tab / Filter

**`category-tab`** + **`category-tab-active`** — Used in sub-nav rows on solutions / connectors pages. Inactive: transparent background, `{colors.muted}` text. Active: `{colors.surface-card}` background, `{colors.ink}` text. Padding 8px × 14px, rounded `{rounded.md}`.

### CTA / Footer

**`cta-band-coral`** — A pre-footer "Try Claude" CTA card. Full-width coral fill, white type, rounded `{rounded.lg}`, padding 64px. Carries an h2 in `{typography.display-sm}` (still serif!), a sub-line, and a cream-button CTA.

**`cta-band-dark`** — Alternative pre-footer band on developer-focused pages. Background `{colors.surface-dark}`, text `{colors.on-dark}`, rounded `{rounded.lg}`, padding 64px. Often pairs with a code-window card.

**`footer`** — Dark navy footer that closes every page. Background `{colors.surface-dark}` (#181715), text `{colors.on-dark-soft}`. 4-column link list at desktop covering Product / Company / Resources / Legal. Vertical padding 64px. The Anthropic spike-mark + "Anthropic" wordmark sits at the top in `{colors.on-dark}`. The footer never inverts.

## Foreign Records

*An amendment. It admits the system's first new hue since the extraction, and a blue at that — which the Don'ts forbid by name. Read the whole section before using it, and before extending it.*

### The problem

The console shows records that do not live in ServiceNow. A Jira issue is served through our own scoped REST route and rendered as a first-class surface inside the app — but it is not our record. Nothing in the system encodes that. Lifecycle state has a colour, risk has a badge, ownership has a name; **provenance has nothing.** A reader looking at a rendered issue has no way to know that the fields in front of them are a copy of something we do not own, cannot change, and did not author.

That is a genuine, missing semantic — not a decoration problem. It earns its own layer.

### The thesis: blue is paper, not ink

**The console is a publication. A foreign record is a facsimile — the same publication, printed on different stock.**

Everything that is the console's *voice* stays the console's: the Copernicus serif headline, the whole type scale, the sans body, the coral focus ring, the coral primary button, the record links, the semantic status pills on native records. Everything that is the record's *origin* is carried by one thing and one thing only: **the colour of the paper.**

This gives the rule its edge, and the edge is what makes it enforceable:

> **Blue is a GROUND, never an ACCENT. The moment blue is used to make something stand out, the rule has been broken.**

So `{colors.jira-ink}` may paint a Jira key, a stamp label, a type glyph. It may never paint a link, a button, a chart series, an emphasis, a "Done", an "info" callout, or anything at all on a native record. It is not in the accent vocabulary. It is not available. DESIGN.md's *"Don't use cool blue or saturated cyan as a brand accent — the coral is the brand voltage"* **stands, unamended.** Provenance is not an accent. The coral is still the only voltage this system has.

### The derivation: why *this* blue

Two traps, and the palette itself points the way out of both.

**The trap.** Atlassian's own blue is `#0052CC` (OKLCH C 0.201); the generic SaaS blue is `#2563EB` (C 0.215). Nothing in this palette exceeds **C 0.165** (`{colors.error}`, the loudest thing we own) and the mean is 0.12. Jira's blue carries **1.2–1.3× the chroma of the most saturated colour in the entire system.** Dropped on `{colors.canvas}` it does not read as "Jira" — it reads as a *different, cheaper website*, which is PRODUCT.md's "generic SaaS admin" anti-reference arriving through the front door.

**The gap.** Every surface in this system is warm (`{colors.canvas}` H 95, `{colors.surface-card}` H 83, `{colors.hairline}` H 68) and every accent hue lives in H 24–179 — coral 39, amber 67, warning 83, success 149, teal 179, error 24. **The palette occupies barely half the hue wheel. The entire cool half is empty.** A blue displaces nothing.

**The corridor.** The canvas is H 95, so its true complement is H 275 — which is violet, and Iteration Guide #6 forbids purple. Rotating the other way, the blue turns cyan by H 235, which the Don'ts forbid by name. **H 250–265 is the whole legal corridor**, bracketed by the system's own prohibitions. `{colors.jira-ink}` sits at **H 256** — 161° from the canvas, as cool as this system can legally go — and holds **C 0.115**, squarely inside the palette's own band. It takes its foreignness from *hue opposition*, not from saturation. An ink-blue, not a button-blue.

**The dividend.** The six existing hues all sit in the red-green-yellow arc — precisely the arc that colour-vision deficiency compresses. Under deuteranopia the palette's worst existing pair (coral/success) separates by ΔE 0.049; `{colors.jira-ink}`'s *closest* neighbour separates by **ΔE 0.124**, over twice as far. **Blue is the one hue that adds categorical separation this palette cannot already make.**

### The family has no light step, and that is not an oversight

Every other hue here is a FILL with an `-ink` step beneath it. The Jira family is **one chromatic token**. The reason is arithmetic, and it will bite anyone who tries to "complete" the family:

**WCAG relative luminance is 71% green, 21% red, 7% blue.** A blue therefore measures far darker than its perceptual lightness suggests. A blue at coral's *exact* OKLCH lightness (L 0.66) lands at **2.96:1** on cream where coral lands at **3.11:1** — it misses the 3:1 floor for shapes and glyphs. To clear 3:1, a blue has to be perceptually darker than every other fill in the system, which walks it straight into its own ink step. **There is no room for two.** `{colors.jira-ink}` (#3465a5) is the type colour, the glyph colour and the one solid fill, all three.

Where the other families reach for a light hue, this one reaches for a **surface**: the tinted stamp is filled with `{colors.jira-card}`, exactly as `{component.badge-pill}` is filled with `{colors.surface-card}`.

**Every Jira fill is opaque — no `/15` alphas.** The semantic pills only ever land on two surfaces, so alpha was safe for them. A Jira stamp lands on cream, on `{colors.jira-canvas}` *and* on `{colors.jira-card}`; an alpha would compound into three different rendered fills to audit. Opaque is one.

### The numbers

Measured against every surface a Jira object can land on. Type gate 4.5:1; shape and focus gate 3:1.

| Token | Hex | Role | on `canvas` | on `surface-card` | on `jira-canvas` | on `jira-card` |
|---|---|---|---|---|---|---|
| `{colors.jira-ink}` | #3465a5 | type · shape · the one solid fill | **5.61** ✅ | **4.89** ✅ | **5.53** ✅ | **4.86** ✅ |
| `{colors.jira-canvas}` | #f2f8ff | the pane floor | 1.015 | — | — | — |
| `{colors.jira-card}` | #deeafb | card / stamp / chip fill | 1.154 | **1.007** ⚠ | 1.138 | — |
| `{colors.jira-hairline}` | #c3d7f2 | edges | 1.392 | 1.213 | 1.372 | 1.206 |
| `{colors.jira-on}` | #f2f8ff | type on a `jira-ink` fill | — | — | — | — |

`{colors.jira-on}` on a `{colors.jira-ink}` fill — the solid "Done" stamp — measures **5.53:1**. For scale: white on `{colors.primary}` is **3.28:1**. *The Done stamp is the most legible badge in this application.*

⚠ `{colors.jira-card}` is invisible as a **fill** on a selected `{colors.surface-card}` row (1.007:1). That is exactly why `{component.jira-key-chip}` always carries a `{colors.jira-hairline}` border: **an object that crosses a boundary brings its own edge.** Stamps that stay home on the Jira pane don't need one.

### Why the pane tint is a whisper

`{colors.jira-canvas}` is **1.015:1** against cream. That is not timidity — it is the ceiling, and the coral focus ring set it.

The ring must clear 3:1 against whatever surface it floats on. Coral on cream is already only **3.11:1**. Solving for the darkest surface that still clears 3.0 leaves **3.7% of luminance headroom below the canvas.** A darker "blue panel" would have killed the focus ring on every button, tab and link on the surface. The constraint made the design better: the tint gets its signal from **hue**, not lightness — cream is R−B = **+5**, `{colors.jira-canvas}` is R−B = **−13**. The warm/cool axis *flips sign*. That is the difference between warm-white and cool-white paper stock, which nobody has trouble telling apart **when the two are adjacent** — and the console is a 50/50 split, so the Jira pane is *always* beside a cream one.

The tint is never asked to work alone. Per PRODUCT.md — *identity is never colour-alone* — the surface also says "Jira" in words, in the header, next to the key.

### Boundary rules

**Blue is allowed:**
- As the floor of a foreign-record surface (`{component.jira-surface}`).
- On cards, panels, stamps and hairlines *within* that surface.
- On `{component.jira-key-chip}` — a Jira key, anywhere, including inside native surfaces.

**Blue is forbidden:**
- On any native record's chrome — a change, a task, a CI, the list pane, the nav, the timeline, the activity feed's own furniture.
- As a link colour. Links are `{colors.primary-ink}` **on the Jira surface too.** Two link colours is one too many.
- As a button. Buttons are coral, on every surface. The Jira pane has no blue button.
- As a status, severity or semantic colour. Blue does not mean "done", "info" or "in progress" — it means "foreign".
- As a chart series. That is the dataviz palette's job.
- As an error colour on the Jira surface. A failed fetch is the **console** failing, not a property of the record: it stays `{colors.error-ink}`. Console voice, console colour.

**The hard case — a Jira key inside a native surface.** A key rides on `change_task.correlation_display` and shows up in the activity feed and in the change's Jiras tab, surrounded by cream and native pills. It reads as `{component.jira-key-chip}`: a small bounded chip, `{rounded.xs}`, tight padding, `{colors.jira-card}` fill, `{colors.jira-hairline}` border, `{colors.jira-ink}` label, `tabular-nums`.

The chip does not break the "blue is a ground" rule — it *is* the rule at another scale. **The chip is a one-inch square of the foreign paper, embedded in ours.** Its blue is the ground *under* the key, and the key's ink is that paper's ink. It is bounded, so the blue never bleeds into the chrome around it; the surrounding row stays entirely native. A Jira key is not a word in the console's sentence — it is a *quotation* from another system, and the chip is the quotation mark.

The tight padding is load-bearing and it is not a style choice: **generous padding (4×12) means badge; tight padding (1×6) means identifier.** It also has to survive inline in a 13px feed line, where a badge's padding would blow the line height apart.

### The badge system

**ServiceNow records wear PILLS (`{rounded.pill}`). Jira records wear STAMPS (`{rounded.xs}`).** Shape is the first and most robust carrier of the boundary — it survives greyscale, CVD, and a squint from across the room. `{rounded.xs}` was documented as "reserved for badge accents" and never used; it is claimed here.

**Status category** is the only Jira object with stamp chrome. One hue, three **ink densities** — a ladder of coverage, not of colour:

| | Treatment | Reads as |
|---|---|---|
| **To Do** | `{component.jira-stamp-todo}` — hollow, border only | not started |
| **In Progress** | `{component.jira-stamp-progress}` — tinted fill | in motion |
| **Done** | `{component.jira-stamp-done}` — solid fill, reversed type | finished |

The ladder is *lightness*, so it survives colour-vision deficiency and photocopying — the ordering is legible with no hue perception at all.

**And it solves the collision the boundary depends on.** A Jira **Done** is a *solid blue square*. A ServiceNow **Closed** is a *tinted green pill*. They differ in **shape**, in **hue**, and in **fill density** — three redundant signals, so no single failure collapses the distinction. This is the one confusion the surface cannot afford, and it is defended three times over.

**Issue type and priority carry no chrome at all** (`{component.jira-fact}`): a glyph in `{colors.jira-ink}`, a word in `{colors.ink}`. Type is *identity* (Story / Bug / Task / Epic / Sub-task); priority is a *rank*, and its glyph is a directional chevron pair (Highest ⌃⌃ → Lowest ⌄⌄) so the ordering is carried by **shape**, never by colour — no red "Highest", which would both steal `{colors.error}`'s meaning and encode severity in hue alone.

Consequence, and it is the point: **there is exactly one stamp per issue.** The stamp shape stays a rare, meaningful mark instead of degrading into badge soup — the same scarcity discipline that governs coral, now governing blue.

### Typography: the headline stays Copernicus

A Jira issue's summary is set in `{typography.display-sm}` — the serif, weight 400, negative tracking — exactly as a change's `short_description` is. This is deliberate and it is the hinge of the whole design.

**The serif is the console's voice reading a foreign record aloud. The blue is the record's provenance.** Those are different jobs and they must not be conflated. Switching the headline to a sans — or worse, to Atlassian's own type voice — would say *"you have left this application"*, which is false. You haven't. You are still in the Weekend Change Console; it is simply showing you something it does not own. **A different system, not a different app.** The paper changes; the printing press does not.

The corollary: **do not create cool text tokens.** Body copy, meta lines and labels on the Jira surface take the console's ordinary `{colors.ink}` / `{colors.body-text}` / `{colors.muted}`. `{colors.jira-ink}` is reserved for type that must read as *Jira identity* — the key, the stamp labels, the glyphs. Warm gray on faintly-cool paper is entirely normal in print, and recolouring the running text cool is precisely the "different app" failure above, committed one word at a time.

### Monospace

Jira sets issue keys in mono. **We do not.** `NET-4821` is the sans stack with `tabular-nums`, like every other identifier in this console. See Typography > Monospace — it is not negotiable, and the Jira surface is the single most tempting place in the app to break it (keys, descriptions, stack traces in comments). Descriptions and comment bodies are `<div>` with `whitespace-pre-wrap`. **Never a `<pre>`, never a `<code>`.**

## Interaction: Hover & Motion

*An amendment (2026-07, owner's instruction). This document used to rule "never document hover — Default and Active/Pressed states only," and the console shipped that way. The owner has explicitly overruled it: every clickable now shifts hue on hover, and the interface carries a small, quiet motion system. This section supersedes the old rule everywhere it appears; the Iteration Guide and the Don'ts have been amended to match.*

### The warm tier: hover is the cursor's heat

The thesis is one sentence: **hover is chromatic — the element under the cursor leans toward the brand coral by one whisper.** Never a grey darken, never an opacity change, never a shadow. The lean is hue movement (toward OKLCH H ~40, the coral corridor), which is what makes it feel like *this* system warming rather than any system highlighting.

Coral scarcity survives by construction: only one element wears the warmth at a time — the one under the cursor — so the resting canvas never gains a drop of coral. And the tier is deliberately a different *hue* from selection, not a different depth: selected and active elements sit in the cream ladder (`{colors.surface-card}`, H ~83 — yellow-warm); the hover wash leans **peach** (H ~63, the coral direction). *Where you are* and *where your cursor is* are chromatically distinct, so a hover can never be mistaken for a selection.

Four native tokens and one foreign one carry the whole tier:

| Token | Derivation | Measured |
|---|---|---|
| `{colors.hover-ink}` #482c22 | ink pulled 35% toward `{colors.primary-ink}` (OKLCH H 40, C 0.045) | 12.0:1 on canvas · 10.5:1 on surface-card · 11.8:1 on jira-canvas |
| `{colors.hover-surface}` #f6efe9 | canvas + 8% coral — surface-soft's weight, peach instead of yellow | `{colors.muted}` on it 5.12:1 · body 9.57:1 |
| `{colors.hover-hairline}` #e0c5b9 | hairline + 25% coral | decorative edge, 1.55:1 on canvas |
| `{colors.hover-primary}` #bb684d | the exact primary → primary-active midpoint | white on it **4.04:1** — rest is 3.28, press is 5.06: hover *improves* legibility on the way down |
| `{colors.jira-hairline-hover}` #9fbbdf | jira-hairline pulled 25% toward jira-ink (H 255, in-family) | decorative edge — see Foreign records below |

The coral focus ring is untouched by all of this: `FOCUS_RING`'s 2px offset band is canvas-coloured, so the ring is always measured against the canvas (3.11:1) and never meets a hover fill.

### The grammar: one lean per element

Each clickable makes **one** perceptible move on hover, chosen by what the element is made of:

| Element | Rest | Hover | Press |
|---|---|---|---|
| Interactive type (record links, coral links, dialog close) | `{colors.ink}` / `{colors.muted}` / `{colors.primary-ink}` | **`{colors.hover-ink}`** — every interactive word converges on one warm voice | underline (links) |
| Unfilled containers (rows-as-buttons, ghost buttons, inactive tabs, nav items, view toggles, timeline rows) | transparent / canvas | **`{colors.hover-surface}`** wash | `{colors.surface-card}` |
| Outlined controls (secondary buttons, bordered cards-as-buttons) | hairline edge, canvas fill | edge → **`{colors.hover-hairline}`** *and* fill → wash (the one two-move pattern: both are whispers) | `{colors.surface-card}` |
| Form fields (inputs, select triggers) | hairline edge | edge → **`{colors.hover-hairline}`** only — no wash under text people read; focus then flips the same border to full coral | — |
| Filled cream pills (person badges, task pills) | `{colors.surface-card}` | **`{colors.surface-cream-strong}`** — already cream, so the warmth gain comes from the ladder, not the peach wash | — |
| The coral button | `{colors.primary}` | **`{colors.hover-primary}`** | `{colors.primary-active}` |
| The Jira key chip (as a link) | `{colors.jira-hairline}` edge | **`{colors.jira-hairline-hover}`** — the edge firms, in the blue family | edge → `{colors.jira-ink}` |

**The press ladder moved with the amendment.** The interactive cream ladder is now canvas → `{colors.hover-surface}` (hover) → `{colors.surface-card}` (press *and* selected — a press previews the selection it causes). `{colors.surface-soft}` as a press state on a clickable is a bug since this amendment: it is indistinguishable from the hover wash sitting under it.

### Rules with teeth

- **Selected elements don't warm.** The active tab, the current nav item, the selected card and the selected timeline row are already home; hover marks a move you could make, not the place you are. Apply hover classes conditionally on `!selected`.
- **Foreign records hover in their own family.** A Jira object never leans toward coral — that would repaint provenance as emphasis, breaking "blue is a ground." Its hover lives in the chip's **edge** (never the fill: `{colors.jira-ink}` on any usefully-deeper fill drops under 4.5:1 — 4.17 at the gentlest perceptible step). Native chrome on the Jira pane (the Referenced-by cream cards, the back button, the issue rows in the Jiras tab) takes the **native** warm tier even there: hover warmth is the console's cursor, like the coral focus ring, and it does not re-tint per surface.
- **The timeline's bars never shift.** The bar palette is dataviz-validated against the cream canvas; a hue shift on hover would repaint the one channel that carries state. The *row* takes the wash; the bar is inert.
- **Radix `data-[highlighted]` keeps `{colors.surface-card}`, untransitioned.** A menu's highlight is its keyboard cursor (pointer hover feeds the same state); weakening it to the hover whisper would cost keyboard users their place, and a colour glide on a fast-moving cursor reads as lag.
- **Status pills never shift hue under a cursor.** A pill's hue is its meaning. (Pills that are *buttons* — person badges — are cream `badge-pill`s and deepen on the ladder, which changes no meaning.)
- **Hover is gated to devices that hover.** `hover:` is wrapped in `@media (hover: hover)`; nothing sticks on touch. The variant is *redefined* in `theme.css` to put that `@media` outside `&:hover` rather than inside — identical semantics, but the default ordering is silently destroyed by the dev server's bundler, which renders every hover class inert on localhost (see CLAUDE.md > Frontend gotchas). The gate is intact; only the nesting order changed.

### Motion

*The extraction shipped none (claude.com's marketing animations were out of scope — see Known Gaps); this is the console's own system, built to the product register: motion conveys state — feedback, arrival, reveal — never decoration, and there is no page-load choreography.*

**One curve, three time bands** (`motion:` in the frontmatter): ease-out-quart for everything — no bounce, no elastic — at 150ms for state glides, 220ms for content arrival, 200ms/150ms for the dialog's open/close (exits run ~75% of entrances).

The system is five `--animate-*` tokens in `theme.css` plus a retuned Tailwind default, and every piece has one job:

- **`transition-colors` everywhere interactive.** Tailwind's `--default-transition-duration`/`--default-transition-timing-function` are set once in `theme.css`, so every hue shift in the app — hover, press, focus border — glides on the same 150ms quart-out curve with nothing at the call site. This is what makes the warm tier feel like one system instead of thirty sprinkled classes.
- **`animate-rise-in`** (fade + 4px rise, 220ms): content arrival. Detail-pane records mount with it when their load resolves — so it fires on every record switch and **never on a silent AMB refetch**; list and feed rows carry it with a 20ms stagger capped at 12 rows (`entranceDelay` in `lib/utils.ts` — a 100-row list settles in under half a second); the grid enters as one block (a hundred `<tr>`s animating transform under a sticky header is paint risk for zero read benefit).
- **`animate-fade-in`** (150ms crossfade): lateral moves — tab panels and select menus. A tab switch is a move between siblings, so the panel fades in place rather than rising. Menus close instantly on purpose.
- **`animate-dialog-in` / `-out`** (200ms/150ms, scale 0.97 ⇄ 1): the window-settings dialog and the grid popout. The keyframes bake in the `-50%` centering translate, because an animation owns `transform` for its whole run.
- **Live means quiet, and now it means *seen*.** The feed keys rows by event id, so a silent refetch keeps existing DOM and only a genuinely new event mounts — rising in at the top with zero delay: the arrival is the telemetry, no toast. Badges carry `transition-colors` in their base, so when AMB moves a change's state the pill's hue *glides* to the new meaning on the same DOM node. The task progress bar's width glides (300ms) instead of teleporting.
- **One kinetic accent, total.** The change card's arrow leans 2px toward where the card will take you (`group-hover`). That is the delight budget; nothing else moves on hover. (One further accent has since been admitted — the AI report's thinking sweep — and it is *not* a hover state. See The ambient loop below for what it had to prove to get in.)

**Reduced motion is the law.** `theme.css` ends with an unlayered `prefers-reduced-motion` block: every transform-carrying animation and transition collapses to `none` (entrances, the dialog scale, crossfades, the arrow nudge, the width glide) while pure colour transitions stay — a hue shift is not motion, and it remains useful feedback. `animation: none` rather than a near-zero duration matters for the dialog: Radix unmounts a closing dialog immediately when no exit animation is running, which is exactly the instant close a reduced-motion user asked for.

**What this system deliberately does not do:** no hover scaling or lifting (hue is the language, and there are no shadows to lift with), no skeleton flashes on live refetches, no scroll-triggered reveals, no spinner replacing content, no motion on the stat chips or headers at load. A console is glanced at for sixty hours straight; the motion budget is spent where state actually changes.

### The ambient loop: one exception, and what it cost to earn

*An amendment (2026-07, owner's instruction). Motion above rules "one kinetic accent, total" and "no spinner replacing content." The AI report dialog (`AiThinking`) introduces a second kinetic accent and a continuous loop. The rules are not waived — the exception is bounded, and it is bounded by the same test the rules were: **motion conveys state, never decoration.***

**The state it conveys is that we are blind.** A language model reading the whole weekend window takes 10–30 seconds and reports *nothing* back until its first token. The console has no progress to show, and every conventional way of filling that wait is a lie: a percentage is invented, a stage list ("cross-referencing CIs…") narrates work we cannot observe, a determinate bar fabricates a denominator that does not exist. **Indeterminate, alive and unhurried is the only honest thing to say**, and an ambient loop is what "indeterminate" looks like. Stillness would say *hung*; a bar would say *false*.

So the loop is admitted, and everything it might have been used to fake is banned instead:

- **The copy is driven by real counts.** The panel states the manifest it actually sent — 110 changes, 242 change tasks, 31 affected CIs — as a **list, never a sequence**. Nothing ticks, nothing completes, nothing lights up in turn. A row that illuminated per stratum would be the stage lie wearing the honest design's clothes.
- **Elapsed seconds is the only progress readout**, because it is the only one that is true. Past 30s it says so.
- **The one real event gets spent as one.** First token flips the headline's verb (reading → writing) and recedes the manifest **chromatically** (ink → `{colors.muted}`). State changes stay colour changes; the motion is not asked to carry meaning it doesn't have.

**The accent is bound to the sentence.** A warm `{colors.primary-ink}` band drifts through the serif headline itself (`background-clip: text`) — through the one line that says what is happening. It is not an ornament beside the state; it *is* the state, rendered. That binding is what keeps it inside the rule rather than beside it. It is also why the band is the **ink** step and not `{colors.primary}`: the sweep repaints real headline glyphs, so it is TYPE, and coral as type is 3.1:1. `{colors.primary-ink}` holds 4.8:1 — the headline clears AA at every *frame*, not merely at rest.

**Two departures from `motion:`, recorded rather than smuggled:**

- **`linear`, not ease-out-quart.** The only linear timing in the app. An eased loop lurches: `from` and `to` are discontinuous across the loop seam, so a curve that ends slow and restarts fast stutters once per cycle. Constant velocity is the only thing that drifts. (The band also sits fully off the text at both ends of its range, which hides the seam a second time.)
- **A fourth time band: 3600ms.** Slower than anything else here, deliberately — this is the opposite of urgency theater. The band passes for ~2s and the headline rests for ~1.6s.

**Reduced motion is still the law, and this is the case that proves it.** Killing an infinite gradient sweep normally leaves a headline frozen half-lit — a broken artifact, worse than no animation. It doesn't here, because the still state was designed first: the `thinking-sweep` utility rests at `opacity: 0` and only the keyframes raise it, so `animation: none` removes the sweep layer and reveals the plain ink serif headline beneath — whole, still, legible. **A reduced-motion user loses no information, because the sweep was never carrying any**: the counts, the copy and the (non-moving) elapsed clock hold every real signal the panel has. If a future ambient loop cannot pass that test — *delete the animation, is the surface still complete and honest?* — it has not earned the exception.

**This is not a precedent for ambient motion generally.** It is admitted to express *one* thing the console had no way to express — a wait we cannot measure — exactly as `{colors.jira-canvas}` was admitted to express a semantic the palette had no way to express. A loop that decorates a surface which already knows its own state is still forbidden, and there is no second exception pending.

## Do's and Don'ts

### Do
- Anchor every page on the cream canvas. Pure white reads as "any other AI tool"; the warm tint is the brand differentiator.
- Use Copernicus serif for every display headline. Pair with StyreneB sans body. Negative letter-spacing on display sizes is non-negotiable.
- Reserve `{colors.primary}` (coral) for primary CTAs and full-bleed `{component.callout-card-coral}` moments. Don't paint accent moments coral elsewhere.
- Use `{component.product-mockup-card-dark}` and `{component.code-window-card}` to show actual Claude product chrome. Don't paint marketing illustrations of code when you can show real code.
- Pair `{component.feature-card}` (cream) with `{component.product-mockup-card-dark}` (navy) in alternating bands. The cream-to-dark rhythm is the brand's pacing mechanism.
- Use the Anthropic spike-mark glyph as the brand wordmark prefix. Never invert the mark to white-on-dark within the wordmark itself.
- Apply `{spacing.section}` (96px) between major bands.

### Don't
- Don't use cool grays or pure white for canvas. Cream is the brand.
- Don't bold serif display weight. Copernicus at 700 reads as bombastic; the system stays at 400.
- Don't use cool blue or saturated cyan as a brand accent. The coral is the brand voltage. **This is unamended by Foreign Records** — `{colors.jira-ink}` is not an accent, it is *provenance*, and it is confined to foreign-record surfaces and `{component.jira-key-chip}`. Blue is a ground, never an accent. It may not paint a link, a button, a status, an emphasis, or anything at all on a native record.
- Don't put coral everywhere. The coral is scarce on individual elements and generous only on full-bleed coral callout cards.
- Don't use Inter for display headlines. The serif character is the brand voice.
- Don't repeat the same surface mode in two consecutive bands. The pacing alternates: cream → cream-card → dark-mockup → cream → coral-callout → dark-footer.
- Don't hover in greyscale, opacity or shadow — hover is **chromatic** (the warm tier: a coral lean for native chrome, an edge-firming within blue for foreign objects; see Interaction: Hover & Motion). And don't let hover repaint meaning: selected elements are already home and don't warm, timeline bars and status pills never shift hue under a cursor, and a Jira object never leans toward coral.
- Don't reach for monospace, ever — not for record numbers, IDs, timestamps, or plan text. There is no mono face in this system. When digits must align, use `tabular-nums` on the sans face.
- Don't paint a status label in its own fill hue. Tinted pills take the `-ink` step; the fill hue as text is 1.8–2.1:1.
- Don't invent a type size. If it isn't on the scale, it's a bug — and don't hand-tune tracking, it ships with the size.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Hamburger nav; hero h1 64→32px; hero-illustration-card stacks below content; feature grids 1-up; connector tiles 2-up; pricing 1-up; footer 4 cols → 1 |
| Tablet | 768–1024px | Top nav stays horizontal but tightens; feature cards 2-up; connector tiles 3-up; pricing 2-up |
| Desktop | 1024–1440px | Full top-nav with all menu items; 3-up feature cards; 4-up or 6-up connector tiles; 3-up pricing tiers |
| Wide | > 1440px | Same as desktop with more outer breathing room; max content width caps at 1200px |

### Touch Targets
- `{component.button-primary}` at minimum 40 × 40px.
- `{component.button-icon-circular}` at exactly 36 × 36 — slightly under WCAG 44 but visually centered.
- `{component.text-input}` height is 40px.
- Connector tile entire card area is tappable; effective tap area >> 44px.

### Collapsing Strategy
- Top nav collapses to hamburger at < 768px; menu opens as a full-screen cream sheet.
- Hero band's 6-6 grid collapses to single-column on mobile — h1 + sub-head + buttons first, then the illustration / mockup card below.
- Feature grids reduce columns rather than scaling cards down.
- Pricing tier cards collapse 4 → 2 → 1; featured-tier dark surface stays visually distinct at every breakpoint.
- Code-window cards retain code legibility at every breakpoint by allowing horizontal scroll within the card rather than wrapping code lines.

### Image Behavior
- Code blocks inside dark mockups stay at fixed font-size; horizontal scroll on mobile rather than wrapping.
- Hero illustrations scale proportionally; line-art strokes thin slightly on mobile.
- Avatar photos in testimonials crop to circles at every breakpoint.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.feature-card}`, `{component.code-window-card}`).
2. Variants of an existing component (`-active`, `-disabled`, `-focused`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Document four states: Default, **Hover**, Active/Pressed, and Focus. Hover (amended 2026-07 by the owner — this rule used to read "never document hover") is the chromatic warm tier: one lean per element, per the grammar in Interaction: Hover & Motion; a `-hover` entry lives beside its base component like every other variant. Focus is still an accessibility requirement, not a style state — `{component.focus-ring}` is the one recipe, and hover never substitutes for it.
5. Display headlines stay Copernicus serif 400 with negative tracking. Body stays StyreneB / Inter 400. The split is unbreakable.
6. Cream + coral + dark is the trinity. Don't introduce a fourth surface tone (no purple cards, no green sections). **One exception exists and it is closed:** `{colors.jira-canvas}` — see Foreign Records. It is admitted to carry a semantic the system had no way to express (this record is not ours), not to add a colour. It is not a precedent for a fifth tone: a new surface tone has to justify itself by naming a *missing semantic*, not a mood. "Purple for security changes" is a mood. There is no second exception pending.
7. When in doubt about emphasis: bigger Copernicus serif before bolder weight.

## Known Gaps

- Copernicus and StyreneB are licensed Anthropic typefaces and not available as public web fonts. Substitutes (Tiempos Headline / Cormorant Garamond / EB Garamond for serif; Inter / Söhne for sans) are documented in the typography section.
- The Anthropic radial-spike-mark is a brand glyph rendered as inline SVG; it's not formalized as a system token here. Treat it as a logo asset.
- claude.com's own animations (chat message reveal, code block typewriter effect, agentic-flow diagrams) were never extracted and remain out of scope. The console no longer inherits that gap: it defines its own motion system — `motion:` in the frontmatter, prose in Interaction: Hover & Motion — built for the product register rather than recovered from the marketing site.
- Form validation states beyond `{component.text-input-focused}` are not extracted — error / success states would need a sign-up or feedback flow to confirm.
- The actual Claude product surface (claude.ai chat interface) shares some tokens with the marketing site but adds many product-specific components (chat bubbles, message tools, file upload chips, conversation history sidebar) that are out of scope for this marketing-surface document.
- The "agent" / "computer use" demo cards on certain pages display animated Claude controlling a browser — the static screenshot doesn't fully capture the animation chrome.
