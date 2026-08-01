# Third-party material used on kolibri.alignment.id

Everything below is either public domain or permissively licensed (MIT, or
CC BY with attribution). No GPL/AGPL, no CC-BY-NC, no "free for personal use"
assets are used on this page. Every file is served locally from
`course/assets/`; nothing is hotlinked.

## Paintings

All are two-dimensional works whose authors died more than 95 years ago;
the Wikimedia Commons file pages record them as public domain (CC-PD-Mark,
`AttributionRequired: false`). Each local copy is a downscaled, recompressed
WebP derivative used decoratively (`aria-hidden` / empty `alt`).

### Claude Monet, *Impression, Sunrise* (1872) — `monet-impression-sunrise.webp`

- Commons file: https://commons.wikimedia.org/wiki/File:Monet_-_Impression,_Sunrise.jpg
- License: Public domain (PD-old-95-1996, CC-PD-Mark)
- Local derivative: 1400 x 1086 WebP, quality 62
- Placement: behind the interactive lesson panel, desaturated and gold-warmed,
  under a radial + linear scrim, with the panel itself translucent over it.

### Claude Monet, *Water Lilies* (1922) — `monet-water-lilies.webp`

- Commons file: https://commons.wikimedia.org/wiki/File:Claude_Monet_-_Water_Lilies_-_Google_Art_Project.jpg
- License: Public domain (PD-Art, PD-old-95-expired, CC-PD-Mark)
- Local derivative: 1280 x 1202 WebP
- Placement: beside the progress section as atmospheric texture.

## Logos

### JavaScript logo — `javascript.svg`

- Source: Wikimedia Commons, *Unofficial JavaScript logo 2* (Chris Williams)
  https://commons.wikimedia.org/wiki/File:Unofficial_JavaScript_logo_2.svg
- License: CC BY 3.0
- Placement: badge at the top-left of the lesson demo's code workspace.

## ASCII art

The hummingbird datasets and `kolibri-closing-art.txt` are project-owned ASCII
renderings, preserved byte-for-byte by the page build; the wave is derived from
Hokusai's *The Great Wave off Kanagawa* (1831, public domain).

Two hummingbird animations drive the page, both motion-stabilised over the
palette `" .:-=+*#%@"` and both already boomeranged, so playing them straight
through on a loop gives the there-and-back wingbeat:

- `hummingbird-feeding_data.js` — hero: hummingbird feeding at a flower, 72 frames, 95x39.
- `hummingbird-hover_data.js` — closing bloom section: flower blooming, 118 frames,
  90x29. (Import slug kept as `hummingbird-hover`; page markup uses `#bloom`.)

Each frame pairs its ASCII with a 0-255 brightness grid that `app.js` turns into
the blue per-glyph glow. Both were imported verbatim from the standalone
renderer output by `course/scripts/import-hummingbird.js`, which also writes the
matching `*-frame0.txt` used as each bird's no-JavaScript and pre-hydration
frame.
