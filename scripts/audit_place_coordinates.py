#!/usr/bin/env python3
"""Compare editorial place names with Kartverket SSR without changing source data.

An SSR name match is evidence for review, not proof of record identity. Stored
coordinates are used only for distance diagnostics, never to confirm a match.
"""
import argparse
import concurrent.futures
import datetime
import hashlib
import html
import json
import math
import re
import threading
import time
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports/place-coordinate-audit'
API = 'https://ws.geonorge.no/stedsnavn/v1/navn'
DOCS = 'https://kartverket.no/en/api-and-data/stedsnavndata/brukarrettleiing-stadnamn-api'
lock = threading.Lock()
last_request = 0.0


def normal(value):
    return re.sub(r'\s+', ' ', value.strip()).casefold()


def query(name, fuzzy=False, offline=False):
    key = hashlib.sha256((name + str(fuzzy)).encode()).hexdigest()
    cache = OUT / 'responses' / (key + '.json')
    if cache.exists():
        return json.loads(cache.read_text())
    if offline:
        raise RuntimeError('No cached response: ' + name)
    rows, pages, total, error = [], [], 0, None
    for page in range(1, 11):
        url = API + '?' + urllib.parse.urlencode({'sok': name, 'fuzzy': str(fuzzy).lower(),
            'treffPerSide': 500, 'side': page, 'utkoordsys': 4258})
        for attempt in range(3):
            try:
                global last_request
                with lock:
                    pause = .35 - (time.monotonic() - last_request)
                    if pause > 0:
                        time.sleep(pause)
                    last_request = time.monotonic()
                req = urllib.request.Request(url, headers={'User-Agent': 'NorwegianFolkLegends-place-audit/1.0'})
                with urllib.request.urlopen(req, timeout=30) as response:
                    data = json.load(response)
                break
            except Exception as exc:
                error = str(exc)
                if attempt == 2:
                    return {'query': name, 'fuzzy': fuzzy, 'error': error, 'pages': pages, 'names': rows}
                time.sleep(attempt + 1)
        total = data['metadata']['totaltAntallTreff']
        rows.extend(data.get('navn', []))
        pages.append({'url': url, 'metadata': data['metadata']})
        if fuzzy or len(rows) >= min(total, 5000):
            break
    result = {'query': name, 'fuzzy': fuzzy, 'retrievedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
        'pages': pages, 'totalHits': total, 'truncated': len(rows) < total, 'names': rows}
    cache.parent.mkdir(parents=True, exist_ok=True)
    cache.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    return result


def variants(name):
    # Extract only components literally recorded in the editorial name. These
    # are search hints; qualifiers, alternatives and uncertainty remain intact.
    cleaned = re.sub(r'\?', '', name).strip()
    result = [cleaned]
    result += re.findall(r'\(([^()]*)\)', cleaned)
    result.append(re.sub(r'\([^()]*\)', '', cleaned).strip())
    for value in list(result):
        result.extend(re.split(r'\s+eller\s+|,|\s+ev\.\s*', value))
    return list(dict.fromkeys(x.strip() for x in result if x.strip() and x.strip() != name))


def distance(a, b):
    if not a or not b:
        return None
    lat1, lat2 = math.radians(a['latitude']), math.radians(b['latitude'])
    dlat, dlon = lat2 - lat1, math.radians(b['longitude'] - a['longitude'])
    h = math.sin(dlat / 2)**2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2)**2
    return round(6371 * 2 * math.asin(min(1, math.sqrt(h))), 2)


def candidates(results, original):
    locations = {}
    for result in results:
        for row in result.get('names', []):
            exact = normal(row['skrivemåte']) == normal(result['query']) and not result['fuzzy']
            if not exact and not result['fuzzy']:
                continue
            key = row['stedsnummer']
            point = row.get('representasjonspunkt', {})
            coord = {'latitude': point['nord'], 'longitude': point['øst']} if point else None
            item = locations.setdefault(key, {'ssrId': key, 'names': [], 'placeType': row['navneobjekttype'],
                'placeStatus': row.get('stedstatus'), 'municipalities': row.get('kommuner') or [],
                'counties': row.get('fylker') or [], 'coordinates': coord,
                'distanceFromEditorialKm': distance(original, coord), 'evidence': []})
            spelling = {'name': row['skrivemåte'], 'status': row['skrivemåtestatus'], 'language': row['språk']}
            if spelling not in item['names']:
                item['names'].append(spelling)
            evidence = {'query': result['query'], 'match': 'exact' if exact else 'fuzzy',
                'url': result['pages'][0]['url']}
            if evidence not in item['evidence']:
                item['evidence'].append(evidence)
    # Distance orders a review list only; it does not select a confirmed match.
    return sorted(locations.values(), key=lambda x: (x['distanceFromEditorialKm'] is None,
        x['distanceFromEditorialKm'] if x['distanceFromEditorialKm'] is not None else 0, x['ssrId']))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--offline', action='store_true', help='rebuild reports using cached API evidence only')
    args = parser.parse_args()
    historical = []
    for filename, classification, kind in [('ssb-municipalities.json', 131, 'municipality'), ('ssb-counties.json', 104, 'county')]:
        path = OUT / filename
        if not path.exists():
            if args.offline:
                raise RuntimeError('Missing historical SSB evidence: ' + filename)
            url = f'https://data.ssb.no/api/klass/v1/classifications/{classification}/codes?from=1838-01-01&to=1955-01-01&language=nb'
            req = urllib.request.Request(url, headers={'Accept': 'application/json'})
            with urllib.request.urlopen(req, timeout=40) as response:
                data = json.load(response)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps({'url': url, 'data': data}, ensure_ascii=False, indent=2) + '\n')
        data = json.loads(path.read_text())
        historical.extend({**row, 'kind': kind, 'sourceUrl': data['url']} for row in data['data']['codes'])
    places = json.loads((ROOT / 'norske_json/places.json').read_text())
    legends = json.loads((ROOT / 'norske_json/legends.json').read_text())
    counties = {x['id']: x['name'] for x in json.loads((ROOT / 'norske_json/counties.json').read_text())}
    county_context = defaultdict(Counter)
    for record in legends:
        if record.get('countyId'):
            county_context[record['placeId']][counties.get(record['countyId'], record['countyId'])] += 1
    unspecified = {'ukjent', 'ingen nærmere stedsangivelse'}
    rows = []

    def audit(place):
        name = place['name']
        if normal(name) in unspecified:
            return {**place, 'status': 'no_location_specified', 'candidates': [], 'queries': [],
                'countyContext': dict(county_context[place['id']])}
        search_name = re.sub(r'\(\s*\)', '', name.replace('?', '')).strip()
        results = [query(search_name, offline=args.offline)]
        exact = candidates(results, place.get('coordinates')) if search_name == name else []
        if not exact:
            results.extend(query(v, offline=args.offline) for v in variants(name) if v != search_name)
        hints = candidates(results, place.get('coordinates'))
        if not hints and not any(x.get('error') for x in results):
            results.append(query(search_name, fuzzy=True, offline=args.offline))
            hints = candidates(results, place.get('coordinates'))[:30]
        if any(x.get('error') for x in results):
            status = 'api_error'
        elif any(x.get('truncated') and not x.get('fuzzy') for x in results):
            status = 'incomplete_search_review'
        elif len(exact) == 1:
            status = 'one_exact_location_review'
        elif len(exact) > 1:
            status = 'multiple_exact_locations_review'
        elif hints:
            status = 'variant_or_fuzzy_review'
        else:
            status = 'no_name_match'
        return {**place, 'status': status, 'countyContext': dict(county_context[place['id']]),
            'queries': [{k: v for k, v in x.items() if k != 'names'} for x in results], 'candidates': hints}

    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        futures = {pool.submit(audit, p): p for p in places}
        for done, future in enumerate(concurrent.futures.as_completed(futures), 1):
            rows.append(future.result())
            if done % 25 == 0:
                print(f'Checked {done}/{len(places)} place names', flush=True)
    rows.sort(key=lambda x: x['name'].casefold())
    shared = defaultdict(list)
    for row in rows:
        c = row.get('coordinates')
        if c:
            shared[(c['longitude'], c['latitude'])].append(row['id'])
    for row in rows:
        c = row.get('coordinates')
        row['sharesEditorialCoordinatesWith'] = [x for x in shared.get((c['longitude'], c['latitude']), []) if x != row['id']] if c else []
        raw = normal(row['name'])
        search_names = {raw, *(normal(v) for v in variants(row['name']))}
        row['historicalAdministrativeMatches'] = [{
            'name': item['name'], 'code': item['code'], 'kind': item['kind'],
            'validFromInRequestedRange': item['validFromInRequestedRange'],
            'validToInRequestedRange': item['validToInRequestedRange'],
            'match': 'exact' if normal(item['name']) == raw else 'recorded-name-component',
            'sourceUrl': item['sourceUrl'], 'notes': item.get('notes', '')
        } for item in historical if normal(item['name']) in search_names]
        row['reviewFlags'] = []
        if '?' in row['name'] or 'eller' in row['name'] or 'ev.' in row['name']:
            row['reviewFlags'].append('uncertain_or_alternative_source_name')
        if row['sharesEditorialCoordinatesWith']:
            row['reviewFlags'].append('shared_editorial_coordinates_do_not_establish_place_identity')
        if row['historicalAdministrativeMatches']:
            row['reviewFlags'].append('historical_administrative_area_requires_area_geometry_or_documented_representative_point')
            small_features = {'Bruk', 'Gard', 'Navnegard', 'Botn', 'Dal', 'Skar'}
            if row['candidates'] and all(c['placeType'] in small_features for c in row['candidates']):
                row['reviewFlags'].append('SSR_namesakes_are_small_features_not_the_historical_administrative_area')
    report = {'generatedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'authority': 'Kartverket – Sentralt stedsnavnregister (SSR)',
        'documentation': DOCS, 'api': API, 'coordinateSystem': 'ETRS89 geographic (EPSG:4258)',
        'sourceSha256': hashlib.sha256((ROOT / 'norske_json/places.json').read_bytes()).hexdigest(),
        'method': 'Exact names first; recorded name components and fuzzy results are review hints only. All SSR IDs retained. Current coordinates are distance diagnostics, not identity evidence. No source names or coordinates modified.',
        'summary': dict(Counter(row['status'] for row in rows)), 'places': rows}
    report['historicalAuthority'] = {'name': 'Statistics Norway (SSB) KLASS',
        'documentation': 'https://data.ssb.no/api/klass/v1/api-guide.html',
        'range': '1838-01-01 to 1955-01-01 (exclusive end)',
        'limitation': 'Administrative identity and history only; SSB classifications do not supply replacement point coordinates. Names before 1838 and geographic regions require other evidence.'}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / 'audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    write_html(report)
    print(json.dumps(report['summary'], ensure_ascii=False), flush=True)


def write_html(report):
    esc = lambda x: html.escape(str(x))
    cards = []
    for place in report['places']:
        rows = []
        for candidate in place['candidates']:
            names = '; '.join(x['name'] + ' (' + x['status'] + ')' for x in candidate['names'])
            county = ', '.join(x['fylkesnavn'] for x in candidate['counties'])
            municipality = ', '.join(x['kommunenavn'] for x in candidate['municipalities'])
            c = candidate['coordinates']
            coord = f"{c['latitude']}, {c['longitude']}" if c else 'No point'
            url = candidate['evidence'][0]['url']
            rows.append(f"<tr><td><a href='{esc(url)}'>{esc(candidate['ssrId'])}</a></td><td>{esc(names)}</td><td>{esc(candidate['placeType'])}<br>{esc(candidate['placeStatus'])}</td><td>{esc(municipality)}<br>{esc(county)}</td><td>{esc(coord)}</td><td>{esc(candidate['distanceFromEditorialKm'])}</td><td>{esc(', '.join(x['match'] + ': ' + x['query'] for x in candidate['evidence']))}</td></tr>")
        c = place.get('coordinates')
        current = f"{c['latitude']}, {c['longitude']}" if c else 'Missing'
        context = ', '.join(f'{k} ({v})' for k, v in place['countyContext'].items()) or 'Not recorded'
        shared = '; '.join(place['sharesEditorialCoordinatesWith']) or 'None'
        history = ''.join(f"<li><a href='{esc(x['sourceUrl'])}'>{esc(x['name'])} – {esc(x['kind'])} {esc(x['code'])}</a>, {esc(x['validFromInRequestedRange'])} to {esc(x['validToInRequestedRange'])} (exclusive end); {esc(x['match'])}</li>" for x in place['historicalAdministrativeMatches'])
        historical_note = f'<h3>SSB historical administrative-name evidence</h3><ul>{history}</ul><p>This identifies an administrative area, not its point location. A settlement, farm or church with the same name is a different geographic feature.</p>' if history else ''
        flags = '<ul>' + ''.join('<li>' + esc(x.replace('_', ' ')) + '</li>' for x in place['reviewFlags']) + '</ul>' if place['reviewFlags'] else ''
        cards.append(f"<details data-name='{esc(place['name'].casefold())}' data-status='{esc(place['status'])}'><summary>{esc(place['name'])} <small>{esc(place['status'].replace('_', ' '))}</small></summary><p>{place['legendCount']} legends · Editorial coordinates: {esc(current)}<br>Recorded county context: {esc(context)}<br>Same editorial coordinates: {esc(shared)}</p>{flags}{historical_note}<div class='table-wrap'><table><thead><tr><th>SSR ID</th><th>SSR spellings / spelling status</th><th>Place type / status</th><th>Municipality / county</th><th>SSR point</th><th>Distance km</th><th>Search evidence</th></tr></thead><tbody>{''.join(rows)}</tbody></table></div></details>")
    counts = ''.join(f'<li>{esc(k.replace("_", " "))}: <strong>{v}</strong></li>' for k, v in report['summary'].items())
    options = ''.join(f'<option value="{esc(k)}">{esc(k.replace("_", " "))}</option>' for k in report['summary'])
    document = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Place-coordinate audit</title>
<style>body{{font:16px/1.55 system-ui;margin:0;background:#fcfaf6;color:#1c2638}}main{{max-width:1400px;margin:auto;padding:32px}}h1,h2{{color:#1f396c}}a{{color:#1f396c}}.note{{padding:16px;border-left:4px solid #b59524;background:#f6edcd}}input,select{{padding:10px 16px;border:1px solid #d4d6db;border-radius:24px;background:white;font:inherit;max-width:100%;box-sizing:border-box}}.controls{{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}}details{{border:1px solid #dededb;border-radius:10px;margin:10px 0;padding:12px;background:white}}summary{{cursor:pointer;font-weight:600}}summary small{{font-weight:400;color:#697387;margin-left:12px}}.table-wrap{{overflow:auto}}table{{border-collapse:collapse;width:100%;font-size:13px}}td,th{{border-bottom:1px solid #dededb;text-align:left;padding:10px;vertical-align:top}}[hidden]{{display:none!important}}</style>
<main><h1>Norwegian Folk Legends: place-coordinate audit</h1><p>All {len(report['places'])} recorded place names checked against <a href="{DOCS}">Kartverket SSR</a>, with <a href="https://data.ssb.no/api/klass/v1/api-guide.html">SSB historical county and municipality classifications</a> covering 1838–1954. Retrieved {esc(report['generatedAt'])}.</p><p class="note">This is a review report, not an approved replacement coordinate list. An exact name match can still be the wrong geographic feature. Historical counties, former municipalities, broad regions, qualifiers and uncertain names require context. Distances compare two representative points and do not prove an error. Original names and coordinates remain unchanged.</p><ul>{counts}</ul><div class="controls"><input type="search" id="search" aria-label="Find a place" placeholder="Find a recorded place name…"><select id="status" aria-label="Filter audit status"><option value="">All review statuses</option>{options}</select></div>{''.join(cards)}</main>
<script>const search=document.querySelector('#search'),status=document.querySelector('#status');function filter(){{for(const row of document.querySelectorAll('details'))row.hidden=!row.dataset.name.includes(search.value.toLocaleLowerCase('no'))||!!status.value&&row.dataset.status!==status.value}}search.addEventListener('input',filter);status.addEventListener('change',filter)</script></html>'''
    (OUT / 'index.html').write_text(document)


if __name__ == '__main__':
    main()
