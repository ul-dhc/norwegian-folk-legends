export const copy = {
  en: {
    eyebrow:'A reading through the landscape', title:'Places apart. Stories together.', intro:'Follow five tellings through places, collectors and voices. Stay with each for as long as you like.',
    demo:'Begin the first journey',another:'Take another journey',loading:'Preparing the journey…',failed:'The records could not be loaded. Please reload to try again.',
    next:'Continue',back:'Previous',finish:'See your journey',auto:'Read automatically',pause:'Pause',resume:'Resume',music:'Sound',soundFailed:'Sound could not start. Try again.',
    motion:'Still map',places:'Places in this telling',record:'Return to record location',collection:'See this collector’s records',
    progress:'Encounter {n} of {total}',first:'Begin with a telling associated with {place}.',
    narrator:'Told by',collector:'Collected by',associated:'Associated place',year:'Year in the record',source:'Open archival record',
    original:'Norwegian original',english:'English translation',noTranslation:'An English translation is not yet available for this record. The Norwegian original follows.',
    region:'Regional location; the exact site is not established.',point:'Map position from the catalogue; it does not establish an exact recording site.',
    note:'Solid lines follow your reading. Dashed lines connect a record to places in its text. They do not reconstruct historical travel.',
    storyNote:'Places identified in this pilot, with supporting passages. Town and regional positions are approximate; these are not exact sites.',
    setting:'In the telling',family:'In the family account',evidence:'Passage in the original',mapLabel:'Map of this reading journey',
    collectorNote:'{count} records in this collection are attributed to {name}. Locations show associations in the catalogue, not an itinerary.',
    summary:'The places and voices you encountered',summaryIntro:'A small path through the collection. Return to a telling, share this sequence, or set out again.',
    share:'Copy this journey',copied:'Journey link copied.',copyFailed:'Copy the address from your browser to share this journey.',history:'Your encounters',
    tileError:'The background map is unavailable. You can still read the legends and follow the place names.',
    oldLink:'This link belongs to a different dataset version; some records or connections may have changed.',
    invalidLink:'This saved journey could not be restored. The demonstration is available below.',
    soundCredit:'Music: Yauheni Kachan / Pixabay', overview:'Your route',
    types:{story:'A shared story place',narrator:'Stay with a voice',place:'Stay with a place',collector:'Through a collector',category:'A shared legend classification',elsewhere:'Elsewhere in the collection'},
  },
  no: {
    eyebrow:'En lesning gjennom landskapet',title:'Fjerne steder. Fortellinger som møtes.',intro:'Følg fem sagn gjennom steder, samlere og fortellerstemmer. Bli ved hvert sagn så lenge du vil.',
    demo:'Begynn den første reisen',another:'Ta en ny reise',loading:'Gjør reisen klar…',failed:'Kunne ikke laste inn sagnene. Last siden på nytt for å prøve igjen.',
    next:'Videre',back:'Forrige',finish:'Se reisen din',auto:'Les automatisk',pause:'Pause',resume:'Fortsett',music:'Lyd',soundFailed:'Lyden kunne ikke startes. Prøv igjen.',
    motion:'Stillestående kart',places:'Steder i fortellingen',record:'Tilbake til stedet i katalogen',collection:'Se samlerens opptegnelser',
    progress:'Sagn {n} av {total}',first:'Vi begynner med et sagn knyttet til {place}.',
    narrator:'Fortalt av',collector:'Samlet av',associated:'Tilknyttet sted',year:'År i opptegnelsen',source:'Åpne arkivopptegnelsen',
    original:'Norsk originaltekst',english:'Engelsk oversettelse',noTranslation:'Denne opptegnelsen har foreløpig ingen engelsk oversettelse. Den norske originalteksten følger.',
    region:'Regional plassering; det nøyaktige stedet er ikke fastslått.',point:'Kartposisjon fra katalogen; den angir ikke nødvendigvis det nøyaktige innsamlingsstedet.',
    note:'Heltrukne linjer følger lesningen din. Stiplede linjer forbinder en opptegnelse med steder i teksten. De viser ikke dokumenterte historiske reiser.',
    storyNote:'Steder identifisert i denne prøveversjonen, med tekstutdrag som grunnlag. Byer og regioner vises omtrentlig, ikke som nøyaktige steder.',
    setting:'I fortellingen',family:'I familieberetningen',evidence:'Utdrag fra originalteksten',mapLabel:'Kart over lesereisen',
    collectorNote:'{count} opptegnelser i denne samlingen er tilskrevet {name}. Stedene viser tilknytninger i katalogen, ikke en reiserute.',
    summary:'Stedene og stemmene du møtte',summaryIntro:'En liten vei gjennom samlingen. Gå tilbake til et sagn, del denne rekkefølgen, eller legg ut på nytt.',
    share:'Kopier reisen',copied:'Lenken til reisen er kopiert.',copyFailed:'Kopier adressen i nettleseren for å dele reisen.',history:'Sagnene på reisen',
    tileError:'Bakgrunnskartet er utilgjengelig. Du kan fortsatt lese sagnene og følge stedsnavnene.',
    oldLink:'Denne lenken tilhører en annen versjon av samlingen. Noen opptegnelser eller forbindelser kan være endret.',
    invalidLink:'Den lagrede reisen kunne ikke hentes. Eksempelreisen er tilgjengelig nedenfor.',
    soundCredit:'Musikk: Yauheni Kachan / Pixabay',overview:'Reisen din',
    types:{story:'Et felles sted i fortellingene',narrator:'Bli hos en forteller',place:'Bli på samme sted',collector:'Gjennom en samler',category:'En felles sagntype',elsewhere:'Et annet sted i samlingen'},
  }
};
export const format = (text, values={}) => text.replace(/\{(\w+)\}/g,(_,key)=>String(values[key]??''));
export function transition(link,lang,index=0) {
  const v=link.value;
  const variants = lang==='en' ? {
    story:[`Both tellings refer to ${v}. Another record brings us back to this place.`,`The place remains: ${v}. Another record brings it into view.`],
    narrator:[`Stay with ${v}. Another account, another part of their recorded repertoire.`,`We follow the same voice into another account: ${v}.`],
    place:[`We stay with ${v}, and open another record associated with this place.`,`Another telling is associated with ${v}. The map rests while the story changes.`],
    collector:[`Our connection is ${v}: both records are attributed to this collector.`,`Through the records attributed to ${v}, we reach another telling.`],
    category:[`Both records carry the classification ${v}. Read them together and notice what changes.`,`These legends share the classification ${v}.`],
    elsewhere:['We leave this thread and open a record elsewhere in the collection.']
  } : {
    story:[`Begge fortellingene viser til ${v}. En annen opptegnelse fører oss tilbake til dette stedet.`,`Stedet er det samme: ${v}. En annen opptegnelse lar oss møte det igjen.`],
    narrator:[`Vi blir hos ${v}. En annen beretning viser mer av det som er bevart etter fortelleren.`,`Vi følger den samme fortellerstemmen inn i en annen beretning: ${v}.`],
    place:[`Vi blir ved ${v} og åpner en annen opptegnelse knyttet til stedet.`,`Et annet sagn er knyttet til ${v}. Kartet hviler mens fortellingen skifter.`],
    collector:[`Forbindelsen er ${v}: begge opptegnelsene er tilskrevet denne samleren.`,`Gjennom opptegnelsene tilskrevet ${v} møter vi et annet sagn.`],
    category:[`Begge opptegnelsene har klassifikasjonen ${v}. Les dem sammen og legg merke til forskjellene.`,`Disse sagnene har samme klassifikasjon: ${v}.`],
    elsewhere:['Vi forlater denne tråden og åpner en opptegnelse et annet sted i samlingen.']
  };
  const choices=variants[link.kind];return choices[index%choices.length];
}
