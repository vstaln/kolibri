# Third-party material used on kolibri.alignment.id

Everything below is either public domain or permissively licensed (MIT). No
GPL/AGPL, no CC-BY-NC, no "free for personal use" assets are used on this page.
Every file is served locally from `course/assets/`; nothing is hotlinked.

## Code

### three.js 0.185.1 — `vendor/three.module.min.js`

- Source: https://github.com/mrdoob/three.js (npm package `three@0.185.1`, `build/three.module.min.js`)
- License: MIT — full text kept alongside the build in `vendor/three-LICENSE.txt`
- Attribution: the MIT notice requires the license text to travel with the copy,
  which `vendor/three-LICENSE.txt` satisfies. No visible page credit is required.
- Usage: only core classes (`WebGLRenderer`, `Scene`, `PerspectiveCamera`,
  `Group`, `BufferGeometry`, `LineBasicMaterial`, `Line*`, `IcosahedronGeometry`,
  `WireframeGeometry`) are used by `course/scene.js`. No `examples/jsm` modules,
  no postprocessing, no textures or environment maps are shipped.

## Paintings

All three are two-dimensional works whose authors died more than 95 years ago;
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

### Vincent van Gogh, *Starry Night Over the Rhône* (1888) — `van-gogh-starry-night-rhone.webp`

- Commons file: https://commons.wikimedia.org/wiki/File:Vincent_van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg
  (the Commons file for the Musée d'Orsay *Starry Night Over the Rhône*)
- License: Public domain (PD-Art, PD-old-100-expired, CC-PD-Mark)
- Local derivative: 1280 x 989 WebP
- Placement: beside the guidance-removal section as atmospheric texture.

## ASCII art

The hummingbird datasets and `kolibri-closing-art.txt` are project-owned ASCII
renderings, preserved byte-for-byte by the page build; the wave is derived from
Hokusai's *The Great Wave off Kanagawa* (1831, public domain).

Two hummingbird animations drive the page, both motion-stabilised over the
palette `" .:-=+*#%@"` and both already boomeranged, so playing them straight
through on a loop gives the there-and-back wingbeat:

- `hummingbird-feeding_data.js` — hero: feeding at a flower, 72 frames, 95x39.
- `hummingbird-hover_data.js` — closing section: hovering in flight, 118 frames,
  90x29.

Each frame pairs its ASCII with a 0-255 brightness grid that `app.js` turns into
the blue per-glyph glow. Both were imported verbatim from the standalone
renderer output by `course/scripts/import-hummingbird.js`, which also writes the
matching `*-frame0.txt` used as each bird's no-JavaScript and pre-hydration
frame.
