// Search matching preserves Norwegian source spelling in displayed highlights.
export const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[c]!,
  );
export const fold = (s: string) =>
  s
    .toLocaleLowerCase('no')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
export const searchNorm = (s: string) => fold(s).replace(/\s+/g, ' ').trim();
export function marked(value: string, terms: string[]) {
  if (!terms.length) return esc(value);
  let normalized = '',
    starts: number[] = [],
    ends: number[] = [];
  for (let i = 0; i < value.length;) {
    const char = String.fromCodePoint(value.codePointAt(i)!),
      next = i + char.length,
      part = fold(char);
    for (const unit of part) {
      normalized += unit;
      starts.push(i);
      ends.push(next);
    }
    i = next;
  }
  const ranges: [number, number][] = [];
  for (const term of terms) {
    let from = 0,
      at = -1;
    while ((at = normalized.indexOf(term, from)) >= 0) {
      ranges.push([starts[at], ends[at + term.length - 1]]);
      from = at + Math.max(1, term.length);
    }
  }
  if (!ranges.length) return esc(value);
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = ranges.reduce<[number, number][]>((all, range) => {
    const last = all.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else all.push([...range]);
    return all;
  }, []);
  let html = '',
    cursor = 0;
  for (const [start, end] of merged) {
    html += esc(value.slice(cursor, start)) + `<mark>${esc(value.slice(start, end))}</mark>`;
    cursor = end;
  }
  return html + esc(value.slice(cursor));
}
export function contextual(
  value: string,
  terms: string[],
  fallback: string,
  expanded = false,
  limitOverride?: number,
) {
  const clean = (value || fallback).replace(/\s+/g, ' ').trim(),
    limit = limitOverride ?? (expanded ? 900 : 260),
    folded = fold(clean),
    term = terms.find((item) => folded.includes(item)) || '';
  if (!term) return clean.slice(0, limit) + (clean.length > limit ? '…' : '');
  const at = folded.indexOf(term),
    before = Math.min(expanded ? 260 : 90, Math.round(limit * 0.38)),
    after = Math.max(50, limit - before - term.length);
  let start = Math.max(0, at - before),
    end = Math.min(clean.length, at + term.length + after);
  if (start) {
    const space = clean.indexOf(' ', start);
    start = space < 0 ? start : space + 1;
  }
  if (end < clean.length) {
    const space = clean.lastIndexOf(' ', end);
    end = space < 0 ? end : space;
  }
  return `${start ? '…' : ''}${clean.slice(start, end)}${end < clean.length ? '…' : ''}`;
}
