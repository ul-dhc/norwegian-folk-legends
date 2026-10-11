# Place-coordinate audit – 11 October 2026

Open [the searchable review report](index.html). Machine-readable evidence is in
[audit.json](audit.json). This is an audit of all 383 recorded place names, not a
list of approved replacements. Source place names and coordinates were not changed.

## Authoritative sources

- **Kartverket, Sentralt stedsnavnregister (SSR):**
  [API documentation](https://kartverket.no/en/api-and-data/stedsnavndata/brukarrettleiing-stadnamn-api).
  Supplies place IDs, spelling status, feature type, municipality/county context,
  and representative coordinates. A register entry can have an unassessed spelling;
  being returned by the register is not the same as having an approved spelling.
- **Statistics Norway (SSB), KLASS:**
  [API documentation](https://data.ssb.no/api/klass/v1/api-guide.html).
  Municipality classification 131 and county classification 104 were queried for
  1838-01-01 through 1955-01-01 (exclusive end). This supplies historical identity,
  codes, periods and notes, not point coordinates. Original names were compared
  exactly; components of qualified names are explicitly labelled as search hints.
- **Kartverket boundary data:**
  [current and historical administrative areas](https://kartverket.no/en/api-and-data/grensedata/).
  Needed when the recorded place refers to a county or municipality, rather than
  a settlement, valley, farm or church with the same name. Historical geometries
  have not been downloaded or used to replace coordinates in this audit.
- **SSB historical reference:**
  [Changes in municipality and county divisions](https://www.ssb.no/offentlig-sektor/artikler-og-publikasjoner/historisk-oversikt-over-endringer-i-kommune-og-fylkesinndelingen).
  A further reference for resolving former administrative places.

## Search results

| SSR search outcome | Recorded names |
|---|---:|
| Multiple exact-name locations, requiring review | 208 |
| One exact-name location, still requiring feature/context review | 71 |
| Qualified name, recorded name component, or fuzzy candidate | 102 |
| Explicitly unspecified location | 2 |
| **Total** | **383** |

296 names have an exact or recorded-component match in the historical SSB
classifications. This is a separate source of evidence and does not mean 296
coordinates have been confirmed.

## Important examples

- **Gudbrandsdalen:** the source county context is Oppland. SSR includes a
  `Dalføre` (valley region), ID **146259**, at **61.59731, 9.84601**, as well as
  other namesakes. This is a regional candidate supported by the recorded
  context, not evidence that each legend happened at that precise point.
- **Oppland:** SSB identifies county **05** during the collection period.
  Same-name small places in SSR are not evidence for locating the former county.
  Its existing shared point with Gudbrandsdalen must not establish place identity.
- **Romsdal:** SSR includes a `Landskapsområde` (landscape region), ID **603302**.
  Gjelsten, Miøy and Otrøy remain separately recorded geographic qualifiers;
  a shared editorial coordinate does not prove these names identify one place.
- **Rindal:** SSB identifies historical municipality **1567**; SSR also returns
  settlement **570611** and several other namesakes. The settlement is a distinct
  geographic feature from the historical municipality. The source uncertainty
  mark in `Rindal?` remains meaningful and is preserved.
- **Etnedal:** SSB identifies municipality **0541**. The single exact-name SSR
  candidate returned by this search is a distant small feature. A unique name
  match alone would therefore produce an incorrect automatic correction.

## How to use this audit

For each place, establish the intended geographic feature using the original
name, qualifiers, recorded county, record date where available, and archive text.
Only then choose a matching authority identifier. Store a regional geometry or
clearly labelled representative point for broad areas. Keep uncertainty and
alternative names visible. Do not merge source places or select candidates
solely because their current coordinates coincide or one candidate is nearest.

The HTML report contains candidate distances as diagnostics only. Large distances
can arise from comparing different kinds of representative points, so they do not
by themselves prove that the editorial coordinates are wrong.

Raw SSR responses are cached in `responses/`; official SSB evidence is saved in
`ssb-municipalities.json` and `ssb-counties.json`. Source URLs, SSR IDs, query
metadata, coordinate system and timestamps are retained. The source place-file
SHA-256 is recorded so changes can be detected.

Re-run with:

```sh
python3 scripts/audit_place_coordinates.py
```

Rebuild using the saved evidence without network requests:

```sh
python3 scripts/audit_place_coordinates.py --offline
```

The report includes up to 30 fuzzy candidates per name. Complete retrieved
responses remain in the cache. A search that exceeds the API's 5,000-result limit
is labelled incomplete instead of being treated as a unique match.
