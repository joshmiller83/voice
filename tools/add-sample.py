#!/usr/bin/env python3
"""Add an audio sample to the site in one command.

Copies the file into audio/, measures its duration, pre-renders its waveform,
and adds it to audio/samples.json. Everything it does by hand is documented in
audio/README.md, so you never *have* to use this — it just saves the typing.

    python3 tools/add-sample.py ~/Desktop/chapter-one.mp3 \
        --title "Chapter One" \
        --note "Business nonfiction, first person"

Add --featured to make it the sample that plays from the hero.
Requires ffmpeg on PATH.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, "audio", "samples.json")


def slugify(name):
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug or "sample"


def duration(path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", path],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE,
    )
    if out.returncode != 0:
        sys.exit("ffprobe failed:\n" + out.stderr.decode(errors="replace"))
    total = int(round(float(out.stdout.decode().strip())))
    return f"{total // 60}:{total % 60:02d}"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("source", help="the audio file to add")
    ap.add_argument("--title", help="display title (default: the filename)")
    ap.add_argument("--note", default="", help="one line describing the sample")
    ap.add_argument("--featured", action="store_true",
                    help="play this one from the hero")
    args = ap.parse_args()

    if not os.path.exists(args.source):
        sys.exit(f"no such file: {args.source}")

    title = args.title or os.path.splitext(os.path.basename(args.source))[0]
    slug = slugify(title)
    filename = f"{slug}.mp3"
    dest = os.path.join(ROOT, "audio", filename)

    if os.path.splitext(args.source)[1].lower() == ".mp3":
        shutil.copy2(args.source, dest)
    else:
        print(f"transcoding to mp3 …")
        subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-i", args.source,
             "-codec:a", "libmp3lame", "-b:a", "128k", "-ac", "1", dest],
            check=True,
        )

    wave = f"img/wave-{slug}.svg"
    subprocess.run(
        [sys.executable, os.path.join(ROOT, "tools", "waveform.py"),
         dest, os.path.join(ROOT, wave)],
        check=True,
    )

    with open(MANIFEST) as fh:
        data = json.load(fh)

    entry = {
        "title": title,
        "file": filename,
        "duration": duration(dest),
        "note": args.note,
        "waveform": wave,
    }
    if args.featured:
        for existing in data["samples"]:
            existing.pop("featured", None)
        entry["featured"] = True

    data["samples"] = [s for s in data["samples"] if s.get("file") != filename]
    data["samples"].append(entry)

    with open(MANIFEST, "w") as fh:
        json.dump(data, fh, indent=2)
        fh.write("\n")

    print(f"\nadded to audio/samples.json:\n{json.dumps(entry, indent=2)}")
    print("\nCommit and push to publish:")
    print(f"  git add audio img && git commit -m 'Add sample: {title}' && git push")


if __name__ == "__main__":
    main()
