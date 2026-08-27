# voice.joshnliz.com

A one-page site for Josh Miller, audiobook narrator. Plain HTML, CSS, and
vanilla JS — no framework, no build step, no npm. GitHub Pages serves the
folder exactly as it sits here, so anything you commit is live within a minute.

```
index.html          the whole page
css/site.css        all styles
js/player.js        the audio player
audio/              MP3s + samples.json (see audio/README.md)
img/                favicon, social card, optional portrait
fonts/              self-hosted Archivo + Literata
tools/              local helper scripts — never served to visitors
CNAME               the custom domain
```

## Everyday jobs

### Add an audio sample

See **[audio/README.md](audio/README.md)**. Short version:

```bash
python3 tools/add-sample.py ~/Desktop/chapter-one.mp3 \
    --title "Chapter One" --note "Business nonfiction" --featured
git add -A && git commit -m "Add sample: Chapter One" && git push
```

The hero plays whichever sample is marked `"featured": true`. Everything else
lands in the Samples list. With no samples at all, the hero shows the
"Samples coming soon" panel and the Samples section hides itself — that state
is designed, not a fallback, so there's no rush.

### Change the words

All copy is in `index.html`, in plain paragraphs. The section order is
hero → samples → about → credits → contact.

Two spots are marked with comments:

- `RESTING COPY` — the two lines in the hero panel shown when there are no
  samples yet.
- `PORTRAIT` — a commented-out `<figure>` in the About section. Delete the two
  comment markers and your photo appears in a second column; the layout adds
  the column on its own. It's off by default because the page is designed to
  stand without it.

### Add your first audiobook credit

In `index.html`, find the `Audiobooks` row in the Credits section and replace
the "Seeking my first titles" line with a list, matching the `<ul class="plain">`
just below it in the Speaking row.

### Update the social card

`img/og.png` is what shows up when the link is pasted into Slack, iMessage, or
LinkedIn. Its source is `tools/og-template.html`. Edit that, then:

```bash
bash tools/make-images.sh
```

Requires Chrome at the standard macOS path. The PNG is committed, so this only
needs to run when you change the card.

## How the player works

`js/player.js` reads `audio/samples.json` and builds one player per sample —
the hero and every row in the Samples list use the same code. It never shows
the browser's default `<audio>` controls.

- Starting one sample pauses any other that's playing.
- The waveform is a **static SVG pre-rendered from the real MP3** by
  `tools/waveform.py`. No waveform library is shipped to the browser; the SVG
  is used as a CSS mask so the stylesheet can paint the played portion amber.
- A sample with no pre-rendered waveform still works — it falls back to a plain
  progress track.
- MP3s are only downloaded when someone actually presses play.
- Click or drag the waveform to scrub. Tab to it and use arrow keys (±5s),
  Page Up/Down (±10s), Home, and End.

One thing worth knowing if you edit the CSS: a relative `url()` inside a CSS
custom property resolves against the **stylesheet's** folder, not the page's.
That's why `player.js` hands the `--wave` property an absolute URL built from
`document.baseURI`. Leave that alone unless you enjoy debugging invisible masks.

## Design notes

The visual language is a broadcast console — slate rack steel, an ivory meter
face, and one tungsten lamp. Amber appears almost nowhere except the play key,
the played portion of a waveform, and focus rings, so when you see it, it means
sound. Two typefaces: **Archivo** (display, the console silkscreen) and
**Literata** (body, a face drawn for reading books).

If you add to the page, the rules that keep it from drifting: no gradients, no
glassmorphism, no icon-card rows, no emoji in copy, no fabricated credits or
testimonials, and at most one or two moments of motion. Everything respects
`prefers-reduced-motion` — including the waveform, which drops from a 60fps
fill to a stepped one.

## Domain and hosting

Served by GitHub Pages from `main` at the repo root, on the custom domain in
`CNAME`. DNS lives in Cloudflare on the `joshnliz.com` zone:

```
voice.joshnliz.com   CNAME → joshmiller83.github.io   (DNS only, not proxied)
```

**The record must stay grey-cloud / DNS-only.** Behind Cloudflare's orange-cloud
proxy, GitHub can't complete the ACME check that issues its TLS certificate, and
proxy + Flexible SSL produces a redirect loop. If you ever do want it proxied,
set the zone's SSL mode to **Full (strict)** first.

To check the certificate and HTTPS state:

```bash
gh api repos/joshmiller83/voice/pages --jq '{cname,https_certificate:.https_certificate.state,https_enforced}'
```

Local preview — the page uses `fetch()` for the manifest, so open it over HTTP
rather than double-clicking the file:

```bash
python3 -m http.server 8765
# http://127.0.0.1:8765/
```
