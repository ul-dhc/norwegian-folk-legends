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
