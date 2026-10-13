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

## Map explorer

The Astro `/map/` workspace adapts the TEIKAS map design and controls to the
Norwegian collection. It uses the same generated records, place IDs and UiO
record IDs as Browse and the individual legend pages.

- Searchable multi-select filters cover ML categories, informants, collectors,
  places, subgenres, counties, genres and translation availability. Collection
  years and undated records can be filtered separately. Empty selections remain
  distinct from selecting all, including after a reload.
- Legends (the default), Places, Clusters, Density and Network are available.
  Places initially shows one hollow circle per recorded place; clicking expands
  its individual legends. Circle size can follow legend count or be uniform.
  Settings include
  OpenFreeMap Dark, Fiord and Positron, plus standard OpenStreetMap, independent
  geographic and label layers, palettes, colour by category or person, rays or
  bubbles, and intensity. OpenFreeMap styles are bundled in public/data/map;
  vector tiles, sprites and fonts are served by OpenFreeMap. The default follows
  the site theme: Positron in light mode and Dark in dark mode.
- Density has its own palette setting. Blue–gold–coral is available only for
  Density and is its default. Legends, clusters and network retain the earlier
  category colours; Legends defaults to yellow place anchors and ML categories. Green, blue, yellow and coral are
  available in both settings, and each setting is remembered independently.
  Density defaults to 100% intensity and radius 14.
- Rays and bubbles spread records around their shared place coordinate to make
  them selectable. Their display positions are illustrative. Exports retain the
  original place coordinates. Unlocated records are kept separately; their
  optional Norwegian Sea marker is symbolic and is never exported as a location.
- Network connects recorded places through shared collectors (the default) or
  shared ML types. Each edge retains exact shared metadata, supporting record
  counts and IDs. Thickness represents the number of shared collectors or types.
  All connections are shown by default; the strongest 10% for each place is an
  optional overview. Node size can follow legend count or unique neighbouring
  places. Visual scales use the complete dataset as a stable reference.
  Selection highlights the place and its connections, fading the surrounding
  network by default; hiding unrelated nodes and threads is optional.
  No collector, informant or ML-category node is assigned an invented location.
  Lines indicate shared recorded metadata, not travel or transmission.
  Records without coordinates remain unlocated and are linked from Settings.
- Filters, view, map extent and settings are reflected in the URL. Place and
  network panels pass their exact selected record IDs to Browse.
- CSV and GeoJSON downloads include selected unlocated records (null geometry in
  GeoJSON). GraphML represents the complete filtered network of either type.
- Map backgrounds use OpenFreeMap or standard OpenStreetMap, with attribution
  displayed on the map. Full screen retains filters and Settings. Mobile maps use
  two-finger gestures so one finger can scroll the page; Browse provides a text
  alternative. About documents the methods through contextual links.

Run `npm run test:map` to build and verify record coverage, source coordinates,
place totals, missing-coordinate handling and filter metadata.

## Data workspace and metadata network

`/data/` provides Overview and Network tabs; existing `?view=network` links remain
valid and `#overview` / `#network` identify the active tab. Shared topic, type,
county, collector, narrator and translation filters are preserved across views.
Network code and styles load when Network is opened; its styles are removed when
returning to Overview. The separate `/ml-index/` classification browser remains.

Map, Browse and Network share compact filter panels. Network menus support typed
search, Norwegian character folding, arrow keys, Enter and Escape. Shared
control tooltips also work with keyboard focus. Mobile filters open as a drawer.

Network Settings contain multiple-node selection (any/all) and node-size modes:
Equal for all or By connection count. Connection sizing counts distinct metadata
neighbours across all available categories, including hidden ones, and normalizes
within each category of the filtered records. Node/text scale controls remain
independent. Selected nodes stay above overlaps, while dimmed context remains
visible. Small viewports compensate motion amplitude without changing its speed.
Fullscreen displays only the visualization, with Escape and trapped keyboard
focus; exiting restores the controls and selection.

Map, Data and Browse use compact record selections, encoding consecutive numeric
IDs as ranges. Decoding expands only known numeric source IDs; older comma-list
links still work. CSV/GeoJSON/GraphML source data and Norwegian place uncertainty
remain unchanged.

Run `npm run build && node --test tests/*.test.js` to verify collection coverage,
network selections, sizing, mobile motion and compact selection round-trips.

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
