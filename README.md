# Norske sagn

Astro-based static platform for exploring 1,477 Norwegian folk legends. The
published editorial Google Sheet is authoritative; committed JSON in
`norske_json/` is generated from that source and powers the website.

## Local development

```sh
pnpm install
pnpm dev
```

## Refresh the data

```sh
pnpm data:generate
```

The original HTML/JavaScript prototype remains in the repository while its
Browse, Map, Network, Timeline, Journey, and ML Index features are migrated to
the Astro platform.

## Legend journey

The Astro `/journey/` page uses `src/journey/`. It replaces the previous journey
with an automatic map-based reading of Norwegian folk legends. Source texts and
editorial data remain unchanged. English interface text is available; legends use
existing English translations where present and otherwise the Norwegian original.

- **Where threads meet** starts at a varied location and continues in batches of
  five legends, keeping the travelled threads connected. Selection uses places,
  collectors, narrators and legend classification, with recent-place avoidance.
- **One thread** follows one curated theme: *A voice calls from the water*
  (15 stops), *The grateful hulder woman* (12), or *The boundary ghost* (9).
  Each ends with a summary of the places, collectors and narrators encountered.
- Collector and narrator networks appear briefly, then disappear. Only visited
  legend paths and hollow place markers remain. The moving point is filled.
- Nearby connections within a collector's records or a thematic route can follow
  present-day roads. Other connections use curves. Neither represents a documented
  historical collecting itinerary.
- The opening introduces the collection; connecting text includes credits, occasional
  recording years and observations or questions grounded in the available records.

### Reading and controls

Legends use complete texts of at most 180 words in both available language versions.
Passages are measured against the available screen space and balanced when splitting
is necessary. Desktop text appears on the right, with the map framed alongside it.
Pause freezes travel and reading. Settings offer Coastlines (default), Quiet landscape
and Terrain, plus a saved reading-time slider. Fullscreen, optional ambient sound,
keyboard navigation and reduced-motion support are available. Backgrounding the page
pauses playback. Norwegian/English switching preserves the current scene.

New starts in the continuous mode are randomized, including when the address has an
older route fragment. Theme links restore the selected theme. URLs describe a theme
or opening batch, not the complete future sequence or playback position.

### Maps and external services

Leaflet renders the journey geometry; MapLibre renders the basemap using OpenFreeMap
vectors and Mapterhorn elevation. Place labels are limited to journey destinations.
Threads have a subtle glow in their assigned colours. Nearby road geometry comes
from the public OSRM demo endpoint, which receives public record coordinates.
Requests time out after 1.8 seconds; unavailable routes, excessive detours, distant
road snapping and ferries fall back to curves. Routes cannot change after movement
has begun. The browser caches up to 80 successful road paths and limits off-screen
map tile caching. A production routing service or precomputed geometry would remove
reliance on the public demo endpoint.

`src/journey/places.json` contains a small geographic pilot with supporting source
passages and coordinate provenance. It distinguishes record locations from places
mentioned in legends; it is not a collection-wide place extraction system.
`/terrain-comparison/` retains the separate terrain study used during development.
The older HTML/JavaScript prototype remains in `js/journey.js`.

### Verification and deployment

Run `pnpm test:journey` to build the production site and test route integrity,
quotation provenance, timing, text preservation, pagination, language switching,
place cooldowns, thematic routes and collection observations. Browser-check map
animation, fullscreen, the reading-time slider and responsive passage layout.

Pushes to `main` run `.github/workflows/deploy-pages.yml`, which builds the Astro
site and replaces the GitHub Pages deployment.
