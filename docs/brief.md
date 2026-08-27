# Project brief: Josh Miller — audiobook narrator website

You are building a one-page website for Josh Miller, a new audiobook narrator on ACX. The site's only job: get a rights holder or producer to **hear his voice within five seconds** and make it easy to contact him. Everything else supports that.

This is a side project, so keep the whole thing simple enough that Josh can maintain it by editing HTML and dropping MP3s into a folder.

---

## 1. Before you write any code — gather these from Josh

Ask for all of these in one batch, not one at a time:

1. **Domain** — which custom domain (or subdomain) to use. If you can list his Cloudflare zones (see §6), show him what's available and ask which one, and whether he wants the apex (`example.com`) or a subdomain (`voice.example.com`).
2. **Voice description** — 3–6 words in his own terms (e.g., "warm, mid-range, unhurried"). Do not invent this.
3. **Contact email** — the one he wants public.
4. **ACX profile URL** — link to it once it's live; use a placeholder comment if not yet.
5. **Audio samples** — MP3 files if he has them. If not, build the sample section with a clean "Samples coming soon — auditions available on request" state and a `/audio/README.md` explaining how to add files (drop in `/audio`, add one line to a small JSON manifest).
6. **Headshot** — optional. The site must look complete without one.
7. **GitHub repo name** — suggest `voice` or `narration`; let him decide.

## 2. Site content

Single page. Sections in order: hero → samples → about → credits → contact. Use this copy as the base. It's written in Josh's voice on purpose — **plain-spoken, no marketing language.** You may tighten it, but don't add adjectives, don't add exclamation points, and don't make it salesy.

**Hero**
- Name: Josh Miller
- Line under the name: "Audiobook narrator — nonfiction, business, and technology"
- Primary action: play his featured sample, right there in the hero.

**About** (adapt, keeping first person and the flat tone):

> I've spent twenty years in web development, and most of that time was spent explaining complicated things in plain language — to clients, to teams, and from conference stages. Narration is a natural extension of that. I have a [VOICE DESCRIPTION] voice, and people have told me for years I should be on the radio. I finally listened.
>
> I'm drawn to nonfiction, business, and technology titles, where my background lets me read with real understanding rather than just pronouncing the words. I record from a home studio in Indiana, I hit deadlines, and I communicate clearly throughout a project.

**Credits**
- Audiobook credits: "Seeking my first titles — auditions welcome." (This is honest and fine. Do not pad it.)
- Speaking and voice experience:
  - Main-stage speaker, DrupalCon Chicago 2026
  - Co-led conference summit session, DrupalCon Chicago 2026
  - 20 years of client presentations, trainings, and recorded technical walkthroughs

**Contact**
- Plain `mailto:` link with his email shown as text (no contact form — this is a static site, and forms mean spam plumbing).
- Link to his ACX profile: "Find me on ACX to request an audition."

## 3. Design direction

Read this section twice. Josh explicitly asked that the site avoid looking AI-generated.

**Ground it in the subject.** This is a site about a voice. The materials of this world are sound, studios, microphones, tape, broadcast. Draw the visual language from there — not from SaaS landing pages.

**The signature element: the hero is a play button.** Not a headline with a play button somewhere below — the invitation to listen *is* the hero. One strong idea here beats ten decorations. A good version of this: a large, tactile play control with a real waveform of his featured sample (pre-render the waveform to SVG or a static image at build time from the actual MP3 — do not ship a heavyweight waveform library for one graphic). When it plays, the waveform fills as a progress indicator. Spend your effort making this one element feel physical and considered; keep everything else quiet.

**Custom audio player, sitewide.** Never show default browser `<audio>` chrome. Build one small vanilla-JS player: play/pause, scrub, time. Only one sample plays at a time — starting one pauses the others. Keyboard operable.

**Typography carries the personality.** Pick a characterful display face and a complementary body face, chosen for this brief specifically. Do not default to Inter/Roboto/Open Sans for everything. Self-host the fonts (no render-blocking third-party font CDN, and the page shouldn't flash unstyled).

**Banned — these are the tells Josh wants avoided:**
- Purple-to-blue gradients, gradient text, glassmorphism, floating blob shapes
- The cream background + serif + terracotta-accent combo, and the near-black + single acid-green accent combo — both are AI defaults now
- Three-column feature cards with icons
- Emoji in headings or body copy
- Copy words: "elevate," "unlock," "seamless," "crafted," "journey," "passionate"
- Fake testimonials, fake logos, fake stats
- Scroll-jacking, parallax, or animation on every section. One or two deliberate moments max (the waveform counts as one). Respect `prefers-reduced-motion`.
- Dark-mode toggle, chatbot widget, cookie banner — none of these belong here

**Quality floor, without announcing it:** responsive down to 360px, visible keyboard focus states, semantic HTML, real `<title>`/meta description/Open Graph tags (OG image can be a simple typographic card), favicon, and Lighthouse ≥ 95 across the board. The page should weigh well under 1 MB before audio.

Before you build, write yourself a short design plan (palette as named hex values, the two typefaces, layout sketch, the signature element) and check it against this brief: if any part of it is what you'd produce for any generic portfolio, change it. Then build to the plan.

## 4. Tech constraints

- **Plain HTML, CSS, and vanilla JS. No framework, no build pipeline, no npm dependencies for the site itself.** A static folder that GitHub Pages serves as-is. (A tiny local script to pre-render the waveform SVG is fine; commit its output.)
- Structure:
  ```
  /index.html
  /css/site.css
  /js/player.js
  /audio/            ← MP3 samples + samples.json manifest
  /img/
  /CNAME             ← created in §6
  ```
- Samples render from `audio/samples.json` (title, file, duration, one-line description) so Josh can add a sample without touching HTML.

## 5. Repo + GitHub Pages deployment

1. Check auth first: `gh auth status`. If not logged in, stop and ask Josh to run `gh auth login`.
2. Create the repo (public), push the site, and enable Pages serving from the `main` branch root:
   - `gh api repos/{owner}/{repo}/pages -X POST -f "source[branch]=main" -f "source[path]=/"`
3. Verify the `*.github.io` URL serves before touching DNS.

## 6. Custom domain via Cloudflare API

Assume credentials may already exist on Josh's machine. **Check before asking**, in this order:
1. Env vars: `CLOUDFLARE_API_TOKEN` (also check `CF_API_TOKEN`)
2. `wrangler whoami` (wrangler stores its own OAuth token)
3. `~/.cloudflare/` or shell profile exports

If nothing works, ask Josh for an API token (needs Zone → DNS → Edit on the target zone) — never ask for or accept his Global API Key.

Then:

1. `GET /client/v4/zones` — list zones, confirm the domain choice with Josh (per §1).
2. Create DNS records, **DNS-only (`"proxied": false`)** — this matters, GitHub can't provision its TLS certificate behind Cloudflare's proxy:
   - Subdomain: one `CNAME` → `<username>.github.io`
   - Apex: four `A` records → `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` (and optionally the matching `AAAA` records)
3. Add the `CNAME` file to the repo root containing the domain, and set it in Pages: `gh api repos/{owner}/{repo}/pages -X PUT -f cname=<domain>`
4. Poll `gh api repos/{owner}/{repo}/pages` until the certificate state is issued (can take a few minutes), then enable HTTPS enforcement: `-X PUT -F https_enforced=true`
5. Only after HTTPS works end-to-end, ask Josh if he wants the Cloudflare proxy turned on. If yes, flip the records to proxied **and** set the zone SSL mode to Full (strict) — proxied + Flexible SSL causes a redirect loop with GitHub Pages.
6. Verify with `curl -I https://<domain>` and confirm a 200 with the right content.

## 7. Done means

- [ ] Site live on the custom domain over HTTPS
- [ ] Featured sample playable from the hero (or the coming-soon state, if no audio yet)
- [ ] Josh can add a sample by dropping an MP3 in `/audio` and editing `samples.json`
- [ ] No banned design tells from §3; copy stayed plain
- [ ] Lighthouse ≥ 95, works at 360px, keyboard accessible
- [ ] A short `README.md` in the repo telling Josh how to update copy, samples, and DNS

Work through this end to end. When something needs Josh's input, batch your questions instead of interrupting repeatedly.
