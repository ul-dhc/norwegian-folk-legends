export const journeySlugs = {
  weave: 'where-threads-meet',
  thread: 'one-thread',
  moe: 'moltke-moe',
};

export function readJourneyHash(hash, themes = []) {
  const value = hash.replace(/^#/, '');
  const [path, query = ''] = value.split('?');
  const [slug, theme] = path.split('/');
  const mode = Object.keys(journeySlugs).find((key) => journeySlugs[key] === slug);
  const saved = new URLSearchParams(mode ? query : value);
  return {
    mode: mode || (['thread', 'moe'].includes(saved.get('mode')) ? saved.get('mode') : 'weave'),
    theme: themes.includes(theme) ? theme : themes.includes(saved.get('theme')) ? saved.get('theme') : null,
    saved,
  };
}

export function journeyHash(mode, theme, saved = {}) {
  const path = journeySlugs[mode] || journeySlugs.weave;
  const query = new URLSearchParams(saved).toString();
  return `${path}${mode === 'thread' && theme ? `/${theme}` : ''}${query ? `?${query}` : ''}`;
}
