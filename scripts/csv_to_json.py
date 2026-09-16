#!/usr/bin/env python3
"""Convert the Norske sagn editorial CSV into validated website JSON.

The published Google Sheet remains the editorial source of truth. The generated
JSON is committed so the public site does not depend on Google Sheets at runtime.
"""

from __future__ import annotations

import csv
import io
import json
import math
import os
import re
import sys
import urllib.request
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "norske_json"
DEFAULT_SOURCE = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTX0GaV9SDaoF3xNvAr3DPifS2ExhtY-NupAS_dlfL5P4lwPro1QMSHIAFU9bmTt7s08ciuR2jWoB1F/"
    "pub?output=csv"
)
REQUIRED = {
    "id", "ml_code", "ml_title", "undersjanger", "tittel", "fylke",
    "sted", "informant", "samler", "år", "år_clean", "signatur",
    "tekstsignatur", "_url", "tekst", "english_translation",
}


def read_source(source: str) -> str:
    path = Path(source)
    if path.exists():
        return path.read_text(encoding="utf-8-sig")
    with urllib.request.urlopen(source, timeout=60) as response:
        return response.read().decode("utf-8-sig")


def clean(value: str | None) -> str | None:
    value = (value or "").strip()
    return value or None


def slug(prefix: str, value: str) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", value.casefold()).strip("-")
    return f"{prefix}-{normalized}" if normalized else prefix


def coordinate(lat: str | None, lon: str | None):
    try:
        latitude, longitude = float(lat or ""), float(lon or "")
        if not (math.isfinite(latitude) and math.isfinite(longitude)):
            return None
        return {"latitude": latitude, "longitude": longitude}
    except ValueError:
        return None


def year_value(row: dict[str, str]) -> int | None:
    raw = clean(row.get("år_clean")) or clean(row.get("år"))
    if not raw:
        return None
    match = re.search(r"\b(1[6-9]\d{2}|20\d{2})\b", raw)
    return int(match.group(1)) if match else None


def entity_records(rows, source_field, prefix, *, coordinates=False):
    counts = Counter(clean(row.get(source_field)) for row in rows)
    values = sorted((value for value in counts if value), key=str.casefold)
    records, ids = [], {}
    for value in values:
        entity_id = slug(prefix, value)
        suffix = 2
        while entity_id in ids.values():
            entity_id = f"{slug(prefix, value)}-{suffix}"
            suffix += 1
        ids[value] = entity_id
        record = {"id": entity_id, "name": value, "legendCount": counts[value]}
        if coordinates:
            matching = next(row for row in rows if clean(row.get(source_field)) == value)
            lat_field = "sted_lat" if source_field == "sted" else "fylke_lat"
            lon_field = "sted_lon" if source_field == "sted" else "fylke_lon"
            record["coordinates"] = coordinate(matching.get(lat_field), matching.get(lon_field))
        records.append(record)
    return records, ids


def main() -> None:
    source = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("NORSKE_SAGN_CSV", DEFAULT_SOURCE)
    rows = list(csv.DictReader(io.StringIO(read_source(source))))
    if not rows:
        raise SystemExit("CSV contains no records")
    missing = REQUIRED - set(rows[0])
    if missing:
        raise SystemExit(f"CSV is missing required columns: {', '.join(sorted(missing))}")
    ids = [clean(row.get("id")) for row in rows]
    if any(not value for value in ids) or len(ids) != len(set(ids)):
        raise SystemExit("Legend IDs must be present and unique")

    collectors, collector_ids = entity_records(rows, "samler", "collector")
    informants, informant_ids = entity_records(rows, "informant", "informant")
    places, place_ids = entity_records(rows, "sted", "place", coordinates=True)
    counties, county_ids = entity_records(rows, "fylke", "county", coordinates=True)
    categories, category_ids = entity_records(rows, "ml_code", "ml")
    category_titles = {}
    for row in rows:
        code, title = clean(row.get("ml_code")), clean(row.get("ml_title"))
        if code and title:
            category_titles.setdefault(code, title)
    for category in categories:
        code = next(code for code, entity_id in category_ids.items() if entity_id == category["id"])
        category.update({"code": code, "title": category_titles.get(code)})
        category.pop("name")

    legends = []
    for row in rows:
        collector, informant = clean(row.get("samler")), clean(row.get("informant"))
        place, county, ml_code = clean(row.get("sted")), clean(row.get("fylke")), clean(row.get("ml_code"))
        legends.append({
            "id": clean(row["id"]),
            "title": {"no": clean(row.get("tittel")), "en": None},
            "text": {"no": clean(row.get("tekst")), "en": clean(row.get("english_translation"))},
            "mlCategoryId": category_ids.get(ml_code),
            "genre": clean(row.get("sjanger")),
            "subgenre": clean(row.get("undersjanger")),
            "collectorId": collector_ids.get(collector),
            "informantId": informant_ids.get(informant),
            "placeId": place_ids.get(place),
            "countyId": county_ids.get(county),
            "year": year_value(row),
            "yearRaw": clean(row.get("år")),
            "archiveSignature": clean(row.get("signatur")),
            "textSignature": clean(row.get("tekstsignatur")),
            "sourceUrl": clean(row.get("_url")),
        })

    OUTPUT.mkdir(exist_ok=True)
    datasets = {
        "legends.json": legends,
        "collectors.json": collectors,
        "informants.json": informants,
        "places.json": places,
        "counties.json": counties,
        "ml-categories.json": categories,
        "dataset-manifest.json": {
            "legendCount": len(legends),
            "translatedCount": sum(bool(item["text"]["en"]) for item in legends),
            "datedCount": sum(item["year"] is not None for item in legends),
            "mappedCount": sum(
                next((place["coordinates"] for place in places if place["id"] == item["placeId"]), None) is not None
                for item in legends
            ),
            "source": DEFAULT_SOURCE,
        },
    }
    for filename, data in datasets.items():
        (OUTPUT / filename).write_text(
            json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
    print(f"Generated {len(legends)} legends in {OUTPUT}")


if __name__ == "__main__":
    main()
