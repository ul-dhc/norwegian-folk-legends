export const cinema={
 en:{title:'Follow the thread.',intro:'Settle into the landscape. A point of light will carry you between places, voices and folk legends. The stories unfold on their own.',begin:'Begin here',fullscreen:'Fullscreen',exit:'Exit',pause:'Pause',resume:'Resume',next:'Next',back:'Back',sound:'Sound',slower:'Slower',still:'Still map',place:'A place in the collection',story:'In the legend',family:'In the family account',original:'Norwegian original',english:'English translation',part:'{n} / {total}',first:'We begin in {place}. A legend opens here.',travel:'The thread leads towards {place}.',storyTravel:'The record is associated with {from}, but the legend mentions {place}.',storyHold:'This passage mentions {place}; the record is associated with {from}.',familyTravel:'This family account mentions {place}. The record is associated with {from}.',collector:'This collection includes {count} records attributed to {name}. The map shows the places associated with them.',narrator:'Told by {name}',collected:'Collected by {name}',again:'Follow another thread',end:'The thread rests here.',endText:'Five encounters, held together for a moment. You can stay in this landscape, or let another journey begin.',source:'Record & source',credit:'Music: Yauheni Kachan / Pixabay',share:'Share this journey',copied:'Journey link copied.',copyFailed:'Copy the browser address to share this journey.',loading:'Preparing the landscape…',failed:'The records could not be loaded. Please reload to try again.',audioFailed:'Sound could not start. Try again.',tiles:'Map tiles are unavailable. The stories can still unfold.',progress:'{n} of {total}',method:'The thread follows a reading through the collection, not a documented historical route.',old:'The collection has changed since this journey was saved.',region:'Approximate regional location',saved:'Begin this journey'},
 no:{title:'Følg tråden.',intro:'Finn ro i landskapet. Et lyspunkt fører deg mellom steder, stemmer og sagn. Fortellingene utfolder seg av seg selv.',begin:'Begynn her',fullscreen:'Fullskjerm',exit:'Avslutt',pause:'Pause',resume:'Fortsett',next:'Neste',back:'Tilbake',sound:'Lyd',slower:'Langsommere',still:'Stillestående kart',place:'Et sted i samlingen',story:'I fortellingen',family:'I familieberetningen',original:'Norsk originaltekst',english:'Engelsk oversettelse',part:'{n} / {total}',first:'Vi begynner i {place}. Her åpner en fortelling seg.',travel:'Tråden fører oss mot {place}.',storyTravel:'Opptegnelsen er knyttet til {from}, men sagnet nevner {place}.',storyHold:'Opptegnelsen er knyttet til {from}. Beretningen når frem til {place}.',familyTravel:'Fra en opptegnelse knyttet til {from} fører et familieminne oss til {place}.',collector:'Samlingen inneholder {count} opptegnelser tilskrevet {name}. Kartet viser stedene de er knyttet til.',narrator:'Fortalt av {name}',collected:'Samlet av {name}',again:'Følg en ny tråd',end:'Her hviler tråden.',endText:'Fem møter, bundet sammen et øyeblikk. Du kan bli i landskapet, eller la en ny reise begynne.',source:'Opptegnelse og kilde',credit:'Musikk: Yauheni Kachan / Pixabay',share:'Del reisen',copied:'Lenken til reisen er kopiert.',copyFailed:'Kopier nettleseradressen for å dele reisen.',loading:'Gjør landskapet klart…',failed:'Kunne ikke laste inn sagnene. Last siden på nytt for å prøve igjen.',audioFailed:'Lyden kunne ikke startes. Prøv igjen.',tiles:'Kartbildene er utilgjengelige. Fortellingene kan fortsatt utfoldes.',progress:'{n} av {total}',method:'Tråden følger en lesning gjennom samlingen, ikke en dokumentert historisk reiserute.',old:'Samlingen er endret siden denne reisen ble lagret.',region:'Omtrentlig regional plassering',saved:'Begynn denne reisen'}
};

Object.assign(cinema.en,{
 modeLabel:'Journey form',weave:'Where threads meet',thread:'One thread',
 weaveNote:'An ongoing journey. Coloured traces remain, and the landscape gathers their connections.',threadNote:'Five legends, one quiet journey, with a place to pause at the end.',
 continue:'The traces remain. From the last legend, another thread unfolds.',
 collectorNetwork:'A collector’s connections',voiceNetwork:'A narrator’s connections',
 narratorNetwork:'{name} is named as the narrator in {count} records. These are the places associated with those legends.',
 networkNote:'Links between records · not documented travel routes',onePlace:'All of these records are associated with the same place.'
});
Object.assign(cinema.no,{
 modeLabel:'Reiseform',weave:'Der trådene møtes',thread:'Én tråd',
 weaveNote:'En reise som fortsetter. Fargede spor blir igjen, og forbindelsene samles i landskapet.',threadNote:'Fem fortellinger, én rolig reise, med en pause ved slutten.',
 continue:'Sporene blir igjen. Fra den siste fortellingen utfolder en ny tråd seg.',
 collectorNetwork:'En samlers forbindelser',voiceNetwork:'En fortellers forbindelser',
 narratorNetwork:'{name} er oppgitt som forteller i {count} opptegnelser. Kartet viser stedene disse sagnene er knyttet til.',
 networkNote:'Forbindelser mellom opptegnelser · ikke dokumenterte reiseruter',onePlace:'Alle disse opptegnelsene er knyttet til samme sted.'
});

cinema.en.collectorHubNote='Centre represents the collection · not the collector’s location';
cinema.no.collectorHubNote='Sentrum viser samlingen · ikke samlerens oppholdssted';

cinema.en.longText='This longer legend is available through Record & source. We leave it there for an unhurried reading, and let the thread continue.';
cinema.no.longText='Denne lengre fortellingen finnes under Opptegnelse og kilde. Der kan den leses i ro og mak, mens tråden fortsetter.';

cinema.en.introduction=[
 "This collection brings together {recordCount} Norwegian folk legends. The available dates in the records range from {firstYear} to {lastYear}.",
 "The records name {collectorCount} collectors. Their work preserves legends shared by local narrators, whose names are recorded in some sources and missing in others.",
 "The legends describe encounters at farms, churches, mountains and water: hidden beings, warnings, unexpected help and unexplained events.",
 "We will read a selection of these legends, following connections between places, people and themes. Each visited place leaves a mark on the map."
];
cinema.no.introduction=[
 "Denne samlingen består av {recordCount} norske sagn. De tilgjengelige årstallene i opptegnelsene strekker seg fra {firstYear} til {lastYear}.",
 "Opptegnelsene navngir {collectorCount} samlere. Arbeidet deres har bevart sagn fra lokale fortellere, som er navngitt i noen kilder og anonyme i andre.",
 "Sagnene beskriver møter ved gårder, kirker, fjell og vann: skjulte vesener, varsler, uventet hjelp og uforklarlige hendelser.",
 "Vi skal lese et utvalg av disse sagnene og følge forbindelser mellom steder, mennesker og temaer. Hvert besøkte sted setter et merke på kartet."
];

cinema.en.roadNote='Present-day road connection · not a historical route';
cinema.no.roadNote='Dagens veiforbindelse · ikke en historisk rute';

cinema.en.threadNote='Choose one theme. Follow it through changing places and voices.';
cinema.no.threadNote='Velg ett tema. Følg det gjennom skiftende steder og stemmer.';
