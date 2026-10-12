export const css = (name: string) =>
    getComputedStyle(document.documentElement).getPropertyValue(name).trim(),
  mix = (color: string, opacity: number) => {
    const context = document.createElement('canvas').getContext('2d')!;
    context.fillStyle = color;
    const normalized = context.fillStyle;
    if (normalized.startsWith('#')) {
      const value = normalized.slice(1),
        full = value.length === 3 ? [...value].map((part) => part + part).join('') : value;
      return `rgba(${parseInt(full.slice(0, 2), 16)},${parseInt(full.slice(2, 4), 16)},${parseInt(full.slice(4, 6), 16)},${opacity})`;
    }
    return color;
  };
export const mapThemeColors = (mapDark: boolean, pointPalette: string, densityPalette: string) => {
  const dark = mapDark;
  const tone = dark ? 'dark' : 'light';
  const spectrum = ['blue', 'gold', 'coral'].map((name) => css(`--map-spectrum-${name}-${tone}`));
  return {
    dark,
    raised: css('--raised'),
    ink: css('--ink'),
    muted: css('--muted'),
    blue: css('--blue'),
    accent: css('--accent'),
    navy: css('--navy'),
    green: css(`--map-data-${pointPalette}-${tone}`),
    density:
      densityPalette === 'spectrum' ? spectrum[0] : css(`--map-data-${densityPalette}-${tone}`),
    spectrum,
    category: Array.from({ length: 7 }, (_, index) => css(`--map-category-${index + 1}-${tone}`)),
    categoryNeutral: css(`--map-category-neutral-${dark ? 'dark' : 'light'}`),
    pin: css('--pin'),
    land: dark ? '#0b172b' : '#f4f7fb',
    water: dark ? '#070d1c' : '#ffffff',
    halo: css('--paper'),
    city: mix(css('--ink'), dark ? 0.68 : 0.58),
    coast: mix(css('--muted'), dark ? 0.56 : 0.42),
    boundary: mix(css('--muted'), dark ? 0.36 : 0.3),
    waterFeature: mix(css('--blue'), dark ? 0.16 : 0.08),
    river: mix(css('--blue'), dark ? 0.34 : 0.22),
  };
};
export const basemapPalette = (style: string) =>
  style === 'dark' || style === 'fiord' ? true : false;

export type MapColors = ReturnType<typeof mapThemeColors>;
