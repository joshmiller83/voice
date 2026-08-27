# Design plan — voice.joshnliz.com

## The concept: the control room, not the landing page

The materials of this world: a broadcast console, a VU meter face, a transport
button you press with your thumb, tungsten light in a dim booth. Every choice
below comes from that room. The test for each one: *would I have produced this
for a generic portfolio?* If yes, it changed.

## Palette (named hex)

Not white-page, not near-black. A **console slate** — the blue-grey of rack
gear under low light — so a waveform reads as lit rather than printed.

| Token | Hex | Where it comes from |
|---|---|---|
| `--booth` | `#1B2027` | console steel, the page ground |
| `--panel` | `#232A33` | a rack unit face, one step up from the ground |
| `--panel-edge` | `#39424E` | the milled bevel between rack units |
| `--meter` | `#EDE6DA` | VU meter face ivory — primary text |
| `--meter-dim` | `#9AA5B1` | silkscreen label grey — secondary text |
| `--tungsten` | `#E8A33D` | the lamp behind a VU needle — THE accent |
| `--tungsten-hot` | `#F4BE68` | needle at peak; hover/active only |
| `--oxblood` | `#8C3B34` | the record button, a vinyl label |

Two accents, both sourced from the subject. Amber is used almost nowhere except
the play control, the waveform's played portion, and focus rings — so when it
appears, it means *sound*.

**Checked against the banned list:** no gradients of any kind, no gradient text,
no glass, no blobs. Not the cream/serif/terracotta combo (ground is slate, not
cream). Not the near-black/acid-green combo (slate ≠ near-black; tungsten amber
and oxblood ≠ a single acid accent).

## Typefaces — "the console and the book"

Two faces with a reason to be together:

- **Display: Archivo** (variable, wght + wdth). Pushed to expanded widths at
  heavy weight it reads like console silkscreen and broadcast signage — flat,
  engineered, confident. Used for the name, section labels, and the time readout.
- **Body: Literata** (variable, wght). A face drawn for long-form reading. This
  is a site about reading books aloud; the body copy should look like a book.

Neither is Inter, Roboto, or Open Sans. Self-hosted woff2, latin subset,
`font-display: swap` with metric-compatible fallbacks so there's no flash of
unstyled text. Both OFL; license committed.

## Layout sketch

```
┌──────────────────────────────────────────────────────┐
│  JOSH MILLER                            [small, wide]│
│  Audiobook narrator — nonfiction,                    │
│  business, and technology                            │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │  ← THE HERO
│  │  ⏵   ▁▃▅▇█▇▅▃▁▂▄▆█▆▄▂▁▃▅▇▅▃▁      0:00 / 1:47 │  │    one panel,
│  │ (88px)   real waveform, amber fills as it plays │  │    inset in the
│  └────────────────────────────────────────────────┘  │    page like a
│                                                      │    rack unit
├──────────────────────────────────────────────────────┤
│  SAMPLES        (from audio/samples.json)            │
│  ⏵ ─────────────────────────  Title      0:52        │  ← track-listing
│  ⏵ ─────────────────────────  Title      1:20        │    rows, hairline
├──────────────────────────────────────────────────────┤    ruled. NOT
│  ABOUT          two-column at ≥900px, book measure   │    three icon cards.
├──────────────────────────────────────────────────────┤
│  CREDITS        label / value rows, hairline ruled   │
├──────────────────────────────────────────────────────┤
│  CONTACT        mailto as text + ACX link            │
└──────────────────────────────────────────────────────┘
```

## The signature element

A **transport control**, not a button on a hero. One panel holds:

- An 88px circular play control that reads as physical: a 1px top highlight, an
  inner shadow below, and a real press state that moves it 1px down. Amber ring
  on `:focus-visible`.
- A **real waveform of the actual MP3**, pre-rendered to SVG at build time by
  `tools/waveform.py` (ffmpeg → raw PCM → per-bucket peaks → mirrored bars).
  No waveform library ships to the browser. The played portion is a second copy
  of the same path in tungsten, revealed by a clip rect driven by `timeupdate`.
- Click or drag anywhere on the waveform to scrub. Arrow keys seek ±5s.

**No audio yet, so:** the panel renders a *dormant meter* — the same geometry at
rest, a fine baseline with low amplitude ticks, and the honest line "Samples
coming soon — auditions available on request." No fabricated waveform for a file
that doesn't exist. The instant a real MP3 lands, the same panel comes alive.

## Motion budget

Two deliberate moments, total:
1. The waveform filling during playback (the whole point).
2. The play control's press depression.

No scroll animation, no parallax, no reveal-on-scroll. Everything inside
`prefers-reduced-motion: reduce` drops to instant state changes.

## Quality floor

Semantic landmarks, one `<h1>`, real `<title>`/description/OG tags, typographic
OG card rendered via headless Chrome, SVG favicon (a transport triangle milled
into a rack panel), visible focus everywhere, 360px clean, no layout shift,
target Lighthouse ≥95 all four. Budget: HTML+CSS+JS+fonts well under 300KB.
