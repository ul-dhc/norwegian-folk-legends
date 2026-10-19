import { known } from './engine.js';
// Short display names; preserve the source metadata and full reading byline.
export const personName = (value) =>
  String(value || '')
    .replace(/\u0092/g, '’')
    .replace(/,?\s+[fd]\.\s*\d{4}.*$/u, '')
    .trim();
export function roadBridge(record, lang = 'en', index = 0) {
  const place = record.sted;
  const lines =
    lang === 'en'
      ? [
          `We follow the road to ${place}, where the next legend comes from.`,
          `Our next legend comes from ${place}. We take the road there.`,
          `Along the road to ${place}, we turn to the next folk legend.`,
          `${place} is our next stop. The map follows the road there.`,
          `The road brings us towards ${place} and another telling.`,
          `A legend from ${place} awaits us at the end of this road.`,
        ]
      : [
          `Vi følger veien til ${place}, der det neste sagnet kommer fra.`,
          `Det neste sagnet kommer fra ${place}. Vi tar veien dit.`,
          `På veien til ${place} går vi videre til det neste sagnet.`,
          `${place} er neste stopp. Kartet følger veien dit.`,
          `Veien fører oss mot ${place} og en ny fortelling.`,
          `Et sagn fra ${place} venter ved enden av denne veien.`,
        ];
  return creditedBridge(lines[Math.floor(index / 3) % lines.length], record, lang, index);
}
export function creditedBridge(text, record, lang = 'en', index = 0) {
  const present = (name) => text.replace(/[’']/g, '').includes(name.replace(/[’']/g, ''));
  const narrator = known(record.informant) ? personName(record.informant) : '';
  const collector = known(record.samler) ? personName(record.samler) : '';
  const n = narrator && !present(narrator),
    c = collector && !present(collector);
  const en = lang === 'en';
  const value = String(record.år_clean || '').trim();
  const year = index % 3 === 2 && /^\d{4}$/.test(value) && !text.includes(value) ? value : '';
  let credit = '';
  if (n && c)
    credit = en
      ? [
          `Told by ${narrator}; recorded by ${collector}${year ? ` in ${year}` : ''}.`,
          `${collector} recorded this telling by ${narrator}${year ? ` in ${year}` : ''}.`,
          `The record names ${narrator} as narrator and ${collector} as collector${year ? `, with the date ${year}` : ''}.`,
        ][index % 3]
      : [
          `Fortalt av ${narrator}; nedtegnet av ${collector}${year ? ` i ${year}` : ''}.`,
          `${collector} nedtegnet denne fortellingen etter ${narrator}${year ? ` i ${year}` : ''}.`,
          `Opptegnelsen navngir ${narrator} som forteller og ${collector} som samler${year ? `, med årstallet ${year}` : ''}.`,
        ][index % 3];
  else if (n)
    credit = en
      ? [
          `${narrator} told this legend.`,
          `The narrator was ${narrator}.`,
          `This telling is attributed to ${narrator}.`,
          `The record names ${narrator} as narrator.`,
        ][index % 4]
      : [
          `${narrator} fortalte dette sagnet.`,
          `Fortelleren var ${narrator}.`,
          `Denne fortellingen er tilskrevet ${narrator}.`,
          `Opptegnelsen navngir ${narrator} som forteller.`,
        ][index % 4];
  else if (c)
    credit = year
      ? en
        ? `${collector} recorded this legend in ${year}.`
        : `${collector} nedtegnet dette sagnet i ${year}.`
      : en
        ? [
            `${collector} recorded this legend.`,
            `The record credits ${collector} as collector.`,
            `This legend is preserved in ${collector}’s collection.`,
          ][index % 3]
        : [
            `${collector} nedtegnet dette sagnet.`,
            `Opptegnelsen oppgir ${collector} som samler.`,
            `Sagnet er bevart i samlingen etter ${collector}.`,
          ][index % 3];
  if (year && !c) {
    const dated = en
      ? [`The record dates from ${year}.`, `It was written down in ${year}.`][
          Math.floor(index / 3) % 2
        ]
      : [`Opptegnelsen er fra ${year}.`, `Sagnet ble skrevet ned i ${year}.`][
          Math.floor(index / 3) % 2
        ];
    credit = [credit, dated].filter(Boolean).join(' ');
  }
  return [text, credit].filter(Boolean).join(' ');
}
export function journeySummary(route, lang = 'en') {
  const en = lang === 'en';
  const places = [...new Set(route.map((r) => r.sted).filter(Boolean))];
  const people = (field) => [
    ...new Set(route.filter((r) => known(r[field])).map((r) => personName(r[field]))),
  ];
  const collectors = people('samler'),
    narrators = people('informant');
  const list = (names) =>
    new Intl.ListFormat(en ? 'en' : 'nb', { style: 'long', type: 'conjunction' }).format(names);
  const unnamed = route.filter((r) => !known(r.informant)).length;
  const uncredited = route.filter((r) => !known(r.samler)).length;
  return {
    counts: en
      ? `${route.length} folk legends · ${places.length} places · ${collectors.length} named collectors · ${narrators.length} named narrators`
      : `${route.length} sagn · ${places.length} steder · ${collectors.length} navngitte samlere · ${narrators.length} navngitte fortellere`,
    places:
      (en ? 'Our route through the archive: ' : 'Vår rute gjennom arkivet: ') + list(places) + '.',
    collectors:
      (collectors.length
        ? (en ? 'The records credit ' : 'Opptegnelsene oppgir ') +
          list(collectors) +
          (en ? ' as collectors.' : ' som samlere.')
        : en
          ? 'No collectors are named in these records.'
          : 'Ingen samlere er navngitt i disse opptegnelsene.') +
      (uncredited
        ? en
          ? ` ${uncredited} of these records ${uncredited === 1 ? 'has' : 'have'} no named collector.`
          : ` ${uncredited} av disse opptegnelsene mangler navngitt samler.`
        : ''),
    narrators:
      (narrators.length
        ? (en ? 'We encountered legends told by ' : 'Vi møtte sagn fortalt av ') +
          list(narrators) +
          '.'
        : en
          ? 'No narrators are named in these records.'
          : 'Ingen fortellere er navngitt i disse opptegnelsene.') +
      (unnamed
        ? en
          ? ` For ${unnamed} of the legends, the narrator is not named in the available metadata.`
          : ` For ${unnamed} av sagnene er fortelleren ikke navngitt i de tilgjengelige metadataene.`
        : ''),
  };
}

// Describe the actual connection, rather than narrating the map animation.
export function continuousBridge(previous, record, link, lang = 'en', index = 0) {
  const en = lang === 'en',
    place = record.sted;
  const narrator = known(record.informant) ? personName(record.informant) : '';
  const collector = known(record.samler) ? personName(record.samler) : '';
  const samePlace =
    previous &&
    !previous.storyPlaces?.length &&
    ((previous.placeId && previous.placeId === record.placeId) || previous.sted === place);
  let text;
  if (!previous)
    text = (
      en
        ? [
            `We begin with a folk legend from ${place}.`,
            `Our first story comes from ${place}.`,
            `${place} is where this reading journey begins.`,
            `We open the collection at a legend from ${place}.`,
          ]
        : [
            `Vi begynner med et sagn fra ${place}.`,
            `Den første fortellingen kommer fra ${place}.`,
            `${place} er utgangspunktet for denne lesereisen.`,
            `Vi åpner samlingen ved et sagn fra ${place}.`,
          ]
    )[index % 4];
  else if (samePlace)
    text = (
      en
        ? [
            `There is another legend from ${place}.`,
            `This next legend is also from ${place}.`,
            `We stay in ${place} for a different story.`,
            `${place} has another telling in the collection.`,
            `Before leaving ${place}, we turn to one more legend.`,
            `Our next story keeps us in ${place}.`,
          ]
        : [
            `Det finnes også et annet sagn fra ${place}.`,
            `Det neste sagnet er også fra ${place}.`,
            `Vi blir i ${place} med en annen fortelling.`,
            `${place} har enda en fortelling i samlingen.`,
            `Før vi forlater ${place}, vender vi oss mot et sagn til.`,
            `Den neste fortellingen holder oss i ${place}.`,
          ]
    )[index % 6];
  else if (link?.kind === 'collector' && collector)
    text = (
      en
        ? [
            `Our next stop is ${place}. ${collector} recorded this legend too.`,
            `Another record by ${collector} brings us to ${place}.`,
            `From ${place} comes a different story, also collected by ${collector}.`,
            `We turn to ${place}, staying with the records of ${collector}.`,
            `${place} is also represented among the legends collected by ${collector}.`,
            `The next telling comes from ${place}. Again, the collector is ${collector}.`,
          ]
        : [
            `Neste stopp er ${place}. ${collector} nedtegnet også dette sagnet.`,
            `En annen opptegnelse etter ${collector} fører oss til ${place}.`,
            `Fra ${place} kommer en annen fortelling, også samlet av ${collector}.`,
            `Vi vender oss mot ${place} og blir ved opptegnelsene etter ${collector}.`,
            `${place} er også representert blant sagnene samlet av ${collector}.`,
            `Den neste fortellingen kommer fra ${place}. Igjen er samleren ${collector}.`,
          ]
    )[index % 6];
  else if (link?.kind === 'narrator' && narrator)
    text = (
      en
        ? [
            `Our next legend is associated with ${place}. ${narrator} told this one too.`,
            `A different story told by ${narrator} brings us to ${place}.`,
            `From ${place} comes another telling attributed to ${narrator}.`,
            `We turn to ${place} and another legend from the same narrator, ${narrator}.`,
            `${place} is the location associated with our next record, again told by ${narrator}.`,
            `The next record is associated with ${place}; the narrator is still ${narrator}.`,
          ]
        : [
            `Det neste sagnet er knyttet til ${place}. ${narrator} fortalte også dette.`,
            `En annen fortelling etter ${narrator} fører oss til ${place}.`,
            `Fra ${place} kommer enda en fortelling tilskrevet ${narrator}.`,
            `Vi vender oss mot ${place} og et nytt sagn fra samme forteller, ${narrator}.`,
            `${place} er stedet knyttet til den neste opptegnelsen, igjen fortalt av ${narrator}.`,
            `Den neste opptegnelsen er knyttet til ${place}; fortelleren er fortsatt ${narrator}.`,
          ]
    )[index % 6];
  else if (link?.kind === 'story')
    text = (
      en
        ? [
            `Our next record comes from ${place}. Both legends mention ${link.value}.`,
            `A legend associated with ${place} returns to a familiar story location: ${link.value}.`,
            `From ${place} comes another story that mentions ${link.value}.`,
            `We turn to a record from ${place}. The place named in both stories is ${link.value}.`,
            `${place} is the next record location; ${link.value} appears in both tellings.`,
            `The next legend is associated with ${place}. Its mention of ${link.value} connects the two records.`,
          ]
        : [
            `Den neste opptegnelsen kommer fra ${place}. Begge sagnene nevner ${link.value}.`,
            `Et sagn knyttet til ${place} vender tilbake til et kjent sted i fortellingene: ${link.value}.`,
            `Fra ${place} kommer et annet sagn som nevner ${link.value}.`,
            `Vi vender oss mot en opptegnelse fra ${place}. Stedet nevnt i begge fortellingene er ${link.value}.`,
            `${place} er stedet for den neste opptegnelsen; ${link.value} forekommer i begge fortellingene.`,
            `Det neste sagnet er knyttet til ${place}. Omtalen av ${link.value} forbinder de to opptegnelsene.`,
          ]
    )[index % 6];
  else if (link?.kind === 'category') {
    // Orient the listener, introduce the record, then explain the connection.
    const arrivals = en
      ? [
          `Our next stop is ${place}.`,
          `A similar story comes from ${place}.`,
          `In ${place}, another legend takes up a similar theme.`,
          `We turn to ${place} for our next story.`,
          `The next telling brings us to ${place}.`,
          `From ${place} comes a story with a familiar theme.`,
        ]
      : [
          `Neste stopp er ${place}.`,
          `Et lignende sagn kommer fra ${place}.`,
          `I ${place} tar et annet sagn opp et lignende tema.`,
          `Vi vender oss mot ${place} for det neste sagnet.`,
          `Den neste fortellingen fører oss til ${place}.`,
          `Fra ${place} kommer et sagn med et kjent tema.`,
        ];
    const arrival = arrivals[index % arrivals.length];
    const credit = collector
      ? en
        ? [
            `${collector} recorded this legend.`,
            `This telling was recorded by ${collector}.`,
            `We have ${collector}’s record of this story.`,
          ][index % 3]
        : [
            `${collector} nedtegnet dette sagnet.`,
            `Denne fortellingen ble nedtegnet av ${collector}.`,
            `Denne opptegnelsen av sagnet er gjort av ${collector}.`,
          ][index % 3]
      : '';
    const connections = en
      ? [
          'These two legends share the same legend classification.',
          'This legend belongs to the same legend type as the previous one.',
          'The collection classifies these two legends under the same type.',
          'Both legends are catalogued as the same legend type.',
          'The shared legend classification connects this record with the previous one.',
        ]
      : [
          'Disse to sagnene tilhører samme sagntype.',
          'Dette sagnet tilhører samme sagntype som det forrige.',
          'Samlingen klassifiserer disse to sagnene under samme type.',
          'Begge sagnene er katalogisert som samme sagntype.',
          'Den felles sagntypen knytter denne opptegnelsen til den forrige.',
        ];
    // Name the collector before any narrator or date supplied by the credits.
    const introduction = creditedBridge(
      [arrival, credit].filter(Boolean).join(' '),
      record,
      lang,
      index,
    );
    return `${introduction} ${connections[index % connections.length]}`;
  } else
    text = (
      en
        ? [
            `The next legend comes from ${place}.`,
            `Now a folk legend from ${place}.`,
            `Our next stop is ${place}, with a different story.`,
            `We turn to a telling from ${place}.`,
            `${place} is our next stop in the collection.`,
            `Another part of the collection brings us to ${place}.`,
          ]
        : [
            `Det neste sagnet kommer fra ${place}.`,
            `Nå et sagn fra ${place}.`,
            `Neste stopp er ${place}, med en annen fortelling.`,
            `Vi vender oss mot en fortelling fra ${place}.`,
            `${place} er neste stopp i samlingen.`,
            `En annen del av samlingen fører oss til ${place}.`,
          ]
    )[index % 6];
  // A collector already introduced at the previous stop need not be announced again.
  const credits = { ...record };
  if (previous?.collectorId && previous.collectorId === record.collectorId) credits.samler = '';
  if (previous?.narratorId && previous.narratorId === record.narratorId) credits.informant = '';
  return creditedBridge(text, credits, lang, index);
}

// Keep places mentioned in a story distinct from the record's associated place.
export function storyPlaceBridge(record, place, lang = 'en', index = 0, hold = false) {
  const from = record.sted,
    to = place.name;
  const family = place.role === 'family';
  const lines =
    lang === 'en'
      ? hold
        ? [
            `This passage mentions ${to}; the record is associated with ${from}.`,
            `${to} appears in the telling. ${from} remains the record's associated place.`,
            `The words point to ${to}, within a record associated with ${from}.`,
            `A mention of ${to}, in the legend associated with ${from}.`,
          ]
        : family
          ? [
              `This family account mentions ${to}. The record is associated with ${from}.`,
              `From the record associated with ${from}, a family memory points to ${to}.`,
              `${to} enters the family account in this record associated with ${from}.`,
              `We turn to ${to}, mentioned in the family account. The record is associated with ${from}.`,
            ]
          : [
              `The record is associated with ${from}, but the legend mentions ${to}.`,
              `${to} appears in this legend, whose record is associated with ${from}.`,
              `From the record associated with ${from}, we turn to a place named in the story: ${to}.`,
              `The telling mentions ${to}. Its record belongs with ${from} in the catalogue.`,
            ]
      : hold
        ? [
            `Dette avsnittet nevner ${to}; opptegnelsen er knyttet til ${from}.`,
            `${to} forekommer i fortellingen. ${from} er fortsatt stedet knyttet til opptegnelsen.`,
            `Ordene viser til ${to}, i en opptegnelse knyttet til ${from}.`,
            `En omtale av ${to}, i sagnet knyttet til ${from}.`,
          ]
        : family
          ? [
              `Denne familieberetningen nevner ${to}. Opptegnelsen er knyttet til ${from}.`,
              `Fra opptegnelsen knyttet til ${from} viser et familieminne til ${to}.`,
              `${to} kommer inn i familieberetningen i denne opptegnelsen knyttet til ${from}.`,
              `Vi vender oss mot ${to}, nevnt i familieberetningen. Opptegnelsen er knyttet til ${from}.`,
            ]
          : [
              `Opptegnelsen er knyttet til ${from}, men sagnet nevner ${to}.`,
              `${to} forekommer i dette sagnet, som er knyttet til ${from} i katalogen.`,
              `Fra opptegnelsen knyttet til ${from} vender vi oss mot et sted navngitt i sagnet: ${to}.`,
              `Fortellingen nevner ${to}. Opptegnelsen hører til ${from} i katalogen.`,
            ];
  return lines[index % lines.length];
}

export function jumpBridge(record, lang = 'en', index = 0) {
  const place = record.sted;
  const lines =
    lang === 'en'
      ? [
          `We leave this thread behind and begin again in ${place}. No connection between these records is recorded in the collection.`,
          `A fresh start in ${place}. The collection records no link between this legend and the one we leave behind.`,
          `We jump to ${place} for a different story. These records have no recorded connection in the collection.`,
          `${place} is where we pick up a new thread, with no recorded link to the previous legend.`,
        ]
      : [
          `Vi forlater denne tråden og begynner på nytt i ${place}. Ingen forbindelse mellom disse opptegnelsene er registrert i samlingen.`,
          `En ny begynnelse i ${place}. Samlingen har ingen registrert forbindelse mellom dette sagnet og det vi forlater.`,
          `Vi hopper til ${place} og en annen fortelling. Disse opptegnelsene har ingen registrert forbindelse i samlingen.`,
          `${place} er stedet der vi tar opp en ny tråd, uten noen registrert forbindelse til det forrige sagnet.`,
        ];
  return lines[index % lines.length];
}

export function networkBridge(record, kind, count, lang = 'en', index = 0) {
  const narrator = kind === 'narrator';
  const name = personName(narrator ? record.informant : record.samler);
  const lines =
    lang === 'en'
      ? narrator
        ? [
            `${name} is named as narrator in ${count} records. These are the places associated with those legends.`,
            `${count} records name ${name} as narrator. Their associated places appear on the map.`,
            `Beyond this legend, we can see the places associated with ${count} records told by ${name}.`,
            `The collection holds ${count} records attributed to the narrator ${name}. The map shows their associated places.`,
          ]
        : [
            `The collection contains ${count} records attributed to ${name}. The map shows their associated places.`,
            `${name} is credited as collector in ${count} records. Here are the places associated with them.`,
            `A wider view of the records collected by ${name}: ${count} entries and their associated places.`,
            `These places belong to ${count} records attributed to the collector ${name}.`,
          ]
      : narrator
        ? [
            `${name} er navngitt som forteller i ${count} opptegnelser. Kartet viser stedene knyttet til disse sagnene.`,
            `${count} opptegnelser navngir ${name} som forteller. De tilknyttede stedene vises på kartet.`,
            `Utover dette sagnet ser vi stedene knyttet til ${count} opptegnelser fortalt av ${name}.`,
            `Samlingen har ${count} opptegnelser tilskrevet fortelleren ${name}. Kartet viser de tilknyttede stedene.`,
          ]
        : [
            `Samlingen inneholder ${count} opptegnelser tilskrevet ${name}. Kartet viser stedene de er knyttet til.`,
            `${name} er oppgitt som samler i ${count} opptegnelser. Her er stedene knyttet til dem.`,
            `Et større utsnitt av opptegnelsene samlet av ${name}: ${count} innførsler og de tilknyttede stedene.`,
            `Disse stedene er knyttet til ${count} opptegnelser tilskrevet samleren ${name}.`,
          ];
  return lines[index % lines.length];
}
