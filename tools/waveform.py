#!/usr/bin/env python3
"""Pre-render an audio file's waveform to a static SVG.

The SVG is used as a CSS mask in the player, so it carries no colour of its
own — the stylesheet paints it. Nothing about this script runs in the browser;
commit its output and ship that.

    python3 tools/waveform.py audio/featured.mp3 img/wave-featured.svg

Requires ffmpeg on PATH.
"""

import os
import subprocess
import sys

BARS = 180  # bar count across the full width
GAP = 0.34  # share of each slot left empty, so bars read as discrete ticks
VW = 1000  # viewBox width
VH = 120  # viewBox height
FLOOR = 0.055  # shortest bar, so silence still has a visible baseline


def decode(path):
    """Decode any ffmpeg-readable file to mono 8kHz signed 16-bit PCM."""
    out = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path,
         "-ac", "1", "-ar", "8000", "-f", "s16le", "-"],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if out.returncode != 0:
        sys.exit("ffmpeg failed:\n" + out.stderr.decode(errors="replace"))
    import array
    samples = array.array("h")
    samples.frombytes(out.stdout[: len(out.stdout) // 2 * 2])
    return samples


def peaks(samples, buckets):
    """Root-mean-square per bucket, which tracks perceived loudness better
    than raw peak and keeps the shape from being all spikes."""
    if not samples:
        return [0.0] * buckets
    size = max(1, len(samples) // buckets)
    vals = []
    for i in range(buckets):
        chunk = samples[i * size:(i + 1) * size]
        if not chunk:
            vals.append(0.0)
            continue
        total = sum(float(s) * s for s in chunk)
        vals.append((total / len(chunk)) ** 0.5 / 32768.0)
    ceiling = max(vals) or 1.0
    # Gentle compression: a narration track is mostly mid-level with a few
    # loud consonants, and a linear scale renders that as a flat sausage.
    return [min(1.0, (v / ceiling) ** 0.72) for v in vals]


def svg(values):
    slot = VW / len(values)
    w = slot * (1 - GAP)
    mid = VH / 2
    rects = []
    for i, v in enumerate(values):
        h = max(VH * FLOOR, v * VH)
        x = i * slot + (slot - w) / 2
        rects.append(
            f'<rect x="{x:.2f}" y="{mid - h / 2:.2f}" '
            f'width="{w:.2f}" height="{h:.2f}"/>'
        )
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {VW} {VH}" '
        f'preserveAspectRatio="none" fill="#000">'
        + "".join(rects)
        + "</svg>\n"
    )


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    src, dest = sys.argv[1], sys.argv[2]
    if not os.path.exists(src):
        sys.exit(f"no such file: {src}")
    os.makedirs(os.path.dirname(dest) or ".", exist_ok=True)
    out = svg(peaks(decode(src), BARS))
    with open(dest, "w") as fh:
        fh.write(out)
    print(f"{dest}  ({len(out) / 1024:.1f} KB, {BARS} bars)")


if __name__ == "__main__":
    main()
