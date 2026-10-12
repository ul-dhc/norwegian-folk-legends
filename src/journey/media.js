import manuscript from '../assets/moe/manuscript-sin473.png?url';
import liv from '../assets/moe/liv-bratterud.jpg?url';
import childhood from '../assets/moe/childhood.jpg?url';
import samlaPortrait from '../assets/moe/samla-portrait.jpg?url';
import portrait from '../assets/moe/portrait.png?url';
export { manuscript, liv, childhood, samlaPortrait, portrait };
export const journeyLifePhotos = (language) => [
  {
    image: childhood,
    crop: { viewBox: '465 550 265 255', width: 1280, height: 2167 },
    label:
      language === 'en'
        ? 'Moltke as a boy · detail of the family portrait'
        : 'Moltke som gutt · utsnitt av familiebildet',
    credit: 'C. T. Thorkildsen / Nasjonalbiblioteket · blds_06261',
  },
  {
    image: samlaPortrait,
    crop: { viewBox: '74 88 245 236', width: 384, height: 589 },
    label: language === 'en' ? 'Moltke Moe · archival portrait' : 'Moltke Moe · arkivportrett',
    credit: 'Norsk Folkeminnesamling · NFS Foto 50 / SAMLA',
  },
  {
    image: portrait,
    crop: { viewBox: '380 365 440 425', width: 1200, height: 1194 },
    label: language === 'en' ? '1911 · in his working room' : '1911 · i arbeidsrommet',
    credit: 'Maal og Minne / Wikimedia Commons',
  },
];
