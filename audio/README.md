# Adding a sample

The site reads this folder's `samples.json` at load. Add an entry there and the
sample appears — you never edit `index.html` to add audio.

## The one-command way

```bash
python3 tools/add-sample.py ~/Desktop/chapter-one.mp3 \
    --title "Chapter One" \
    --note "Business nonfiction, first person" \
    --featured
```

That copies the file in, measures its duration, pre-renders its waveform, and
writes the manifest entry. `--featured` makes it the sample that plays from the
hero. Then `git add -A && git commit -m "Add sample" && git push`.

## The by-hand way

1. Drop the MP3 in this folder — lowercase, hyphens, no spaces:
   `chapter-one.mp3`
2. Add one entry to the `samples` array in `samples.json`:

```json
{
  "samples": [
    {
      "title": "Chapter One",
      "file": "chapter-one.mp3",
      "duration": "1:47",
      "note": "Business nonfiction, first person",
      "featured": true
    }
  ]
}
```

| Field | Required | What it does |
|---|---|---|
| `title` | yes | Shown next to the play control |
| `file` | yes | Filename inside `/audio` |
| `duration` | yes | Shown before playback starts, as `m:ss`. The real duration replaces it once the file loads, so an estimate is fine |
| `note` | no | One quiet line under the title |
| `featured` | no | `true` on exactly one sample puts it in the hero |
| `waveform` | no | Path to a pre-rendered SVG, e.g. `img/wave-chapter-one.svg` |

Leave `waveform` out and the player draws a plain progress track instead — it
works fine, it just isn't as nice. To generate one:

```bash
python3 tools/waveform.py audio/chapter-one.mp3 img/wave-chapter-one.svg
```

Then add `"waveform": "img/wave-chapter-one.svg"` to that sample's entry.

If no sample is marked `featured`, the hero uses the first one in the list. If
the array is empty, the hero shows the "samples coming soon" state and the
samples section hides itself.

## What makes a good sample here

Keep them short — 60 to 120 seconds. A producer decides in the first ten
seconds, and a 15-minute file just costs them a download. Three samples is
plenty; the point is range, not volume.

Encode mono at 128 kbps or lower. These are auditions, not the finished book,
and a 1 MB file that starts instantly beats a 6 MB file that buffers.
`add-sample.py` does this for you when it transcodes.
