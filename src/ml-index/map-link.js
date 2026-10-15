// Match the map's canonical theme values, including the ML code to disambiguate titles.
export function mapLink(base, types) {
  const params = new URLSearchParams({ theme: types.map(type => type.mapTheme).join('|') });
  return `${base}map/?${params}`;
}
