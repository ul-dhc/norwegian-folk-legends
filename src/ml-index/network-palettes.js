// Category order: county, collector, narrator, ML type, topic, place.
// Four distinct colour families, adapted to light and dark backgrounds.
export const paletteFields = ['county', 'collector', 'narrator', 'typeId', 'topic', 'place'];
export const networkPalettes = [
  // Earth, forest and old ink: grounded, saturated rather than pastel.
  { id: 'sagn', name: 'Sagn', source: 'Norske sagn · earth and forest',
    light: ['#176b50', '#294d80', '#963c32', '#737b2f', '#704575', '#a77916'],
    dark: ['#309c72', '#548ac5', '#d46d50', '#a1ac4c', '#ac70ae', '#d8a52f'] },
  // Embers and stone: predominantly warm, with a smoky neutral.
  { id: 'troll', name: 'Troll', source: 'Norske sagn · embers and stone',
    light: ['#cc4824', '#7b293e', '#bd8215', '#665a51', '#a14f1b', '#d16a70'],
    dark: ['#f06a35', '#bf526c', '#edb343', '#a8998a', '#d38b48', '#ed9698'] },
  // Mist and woodland flowers: soft, muted colours.
  { id: 'huldra', name: 'Huldra', source: 'Norske sagn · mist and flowers',
    light: ['#65a69b', '#7798bd', '#c77e9a', '#8eab77', '#a087ba', '#b69b77'],
    dark: ['#a8d9c9', '#a8c8e4', '#e9b1c5', '#bdd6ab', '#c4b1de', '#d8c6ab'] },
  // Aurora: cool, luminous colours with an electric green accent.
  { id: 'nordlys', name: 'Nordlys', source: 'Norske sagn · aurora',
    light: ['#008da4', '#3d55cf', '#a332bb', '#087e70', '#6838ce', '#6c9814'],
    dark: ['#24d4e5', '#6f91ff', '#ee63d8', '#36dcac', '#ae7aff', '#c2eb3b'] },
];
export function paletteVariables(id) {
  const palette = networkPalettes.find(item => item.id === id) || networkPalettes[0];
  return paletteFields.flatMap((field, index) => ['light', 'dark'].map(theme => `--network-${field}-${theme}:${palette[theme][index]}`)).join(';');
}
