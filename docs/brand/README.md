# Rigfriend

The friend who knows what's holding your rig back.

Rigfriend helps podcasters, YouTubers and musicians find the one thing limiting their setup, whether that's gear (a mic the interface can't drive) or workflow (editing hours an AI tool could cut), and shows the fix with honest math. It earns affiliate commissions, and says so plainly.

## Who we talk to

A creator upgrading a setup that's holding them back. They already record and edit, they arrive on a phone from a short video or a forum thread, and they want an answer in seconds.

## Voice

A friend who knows their stuff: specific, calm, a little funny, never salesy. The brand is voice-led and faceless; copy should sound right read aloud.

- **Specific over soft.** "This mic needs 60 dB of clean gain. Your interface gives 56, so you'll hear hiss." Not "this setup may not be optimal."
- **Say when not to buy.** "At 3 hours a week, this stack won't pay for itself yet. Stick with the free plan." This is the brand's main trust signal.
- **Plain verbs, sentence case.** Buttons say exactly what happens: "Check my mic", "Email me this build", "See Descript plans".
- **Money shown honestly.** Cash price first, installments second, with the retailer's real terms and a "checked" date.
- **No hype.** No "ultimate", "game-changing", fake urgency, or invented testing. Only say "tested" about gear that was actually tested.

Disclosure line, near the first affiliate link on every page: "We earn a commission if you buy through these links, at no extra cost to you."

## Color

The look comes from a mixing console: an ink-navy body, amber signal lights, and level meters that show cost against savings.

- `paper` is the page, `panel` holds tools. Text is `ink`; secondary text is `ink-muted`.
- `signal` (amber) is the brand color and the only primary-button fill, with `on-signal` text. In light theme it never appears as text or thin lines on `paper`.
- `savings` (teal) means money or time back. `overload` (red) means what a problem costs or a compatibility warning. They differ in lightness as well as hue, and always come with words.
- `line` is for dividers and unlit meter segments only; control borders use `control-border`. Focus rings use `focus`.

Every text pair meets 4.5:1 in both themes; the ratios are in each token's note.

## Type

Two families, both free on Google Fonts:

- **Barlow Condensed** (`display`, 600 and 700): headlines, result lines and every number, like a console readout. Use tabular figures for numbers that change.
- **IBM Plex Sans** (`body`, 400 and 500): everything else.

Body text is 16px minimum and labels 14px minimum on mobile. Headlines are sentence case; no all-caps labels.

## Shape and space

Corners are friendly but not bubbly: `radius-sm` (6px) on controls, `radius-lg` (12px) on panels and the bottom sheet. Spacing runs on `space-1` through `space-10`; mobile pages use `space-4` side margins and `space-10` between sections. The signature element is the segmented meter: rounded `radius-sm` segments with a `space-1` gap, lit in `savings` or `overload`, unlit in `line`.

## Logo

- **Mark:** a friendly face on an ink tile with radius-lg corners: two `paper` eyes and a smile made of five amber meter segments, the same segmented meter the tools use. It's the favicon, app icon and social avatar, and it reads down to 16px.
- **Wordmark:** "rigfriend" in lowercase, Barlow Condensed 700, `ink` on light grounds and `paper` on dark, set beside the mark. Plain type, no custom lettering.
- Keep clear space of one eye-width around the mark. Don't stretch it, recolor the smile, or put it on photos.

## Icons

Simple line icons at 1.5px stroke in `ink` or `ink-muted`, 20–24px. No emoji in the interface.

## Using this in the site

Load both fonts with `next/font/google` as CSS variables, then map every color, spacing and radius token to CSS variables of the same name. The existing ROI calculator needs two updates: replace the steel grey small text with `ink-muted`, and move its 3px corners to `radius-sm`.
