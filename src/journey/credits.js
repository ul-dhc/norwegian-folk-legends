import {known} from './engine.js';
// Short display names; preserve the source metadata and full reading byline.
export const personName=value=>String(value||'').replace(/\u0092/g,'’').replace(/,?\s+[fd]\.\s*\d{4}.*$/u,'').trim();
export function roadBridge(record,lang='en',index=0){
 const place=record.sted;
 const lines=lang==='en'?[
  `We follow the road to ${place}, where the next legend comes from.`,
  `Our next legend comes from ${place}. We take the road there.`,
  `Along the road to ${place}, we turn to the next folk legend.`
 ]:[
  `Vi følger veien til ${place}, der det neste sagnet kommer fra.`,
  `Det neste sagnet kommer fra ${place}. Vi tar veien dit.`,
  `På veien til ${place} går vi videre til det neste sagnet.`
 ];
 return creditedBridge(lines[Math.floor(index/3)%lines.length],record,lang,index);
}
export function creditedBridge(text,record,lang='en',index=0){
 const present=name=>text.replace(/[’']/g,'').includes(name.replace(/[’']/g,''));
 const narrator=known(record.informant)?personName(record.informant):'';
 const collector=known(record.samler)?personName(record.samler):'';
 const n=narrator&&!present(narrator),c=collector&&!present(collector);
 const en=lang==='en';
 const value=String(record.år_clean||'').trim();
 const year=index%3===2&&/^\d{4}$/.test(value)&&!text.includes(value)?value:'';
 let credit='';
 if(n&&c)credit=en?`Told by ${narrator}; recorded by ${collector}${year?` in ${year}`:''}.`:`Fortalt av ${narrator}; nedtegnet av ${collector}${year?` i ${year}`:''}.`;
 else if(n)credit=en?`${narrator} told this legend.`:`${narrator} fortalte dette sagnet.`;
 else if(c)credit=year?(en?`${collector} recorded this legend in ${year}.`:`${collector} nedtegnet dette sagnet i ${year}.`):(en?[`${collector} recorded this legend.`,`The record credits ${collector} as collector.`,`This legend is preserved in ${collector}’s collection.`][index%3]:[`${collector} nedtegnet dette sagnet.`,`Opptegnelsen oppgir ${collector} som samler.`,`Sagnet er bevart i samlingen etter ${collector}.`][index%3]);
 if(year&&!c){
  const dated=en?[`The record dates from ${year}.`,`It was written down in ${year}.`][Math.floor(index/3)%2]:[`Opptegnelsen er fra ${year}.`,`Sagnet ble skrevet ned i ${year}.`][Math.floor(index/3)%2];
  credit=[credit,dated].filter(Boolean).join(' ');
 }
 return [text,credit].filter(Boolean).join(' ');
}
export function journeySummary(route,lang='en'){
 const en=lang==='en';
 const places=[...new Set(route.map(r=>r.sted).filter(Boolean))];
 const people=field=>[...new Set(route.filter(r=>known(r[field])).map(r=>personName(r[field])))];
 const collectors=people('samler'),narrators=people('informant');
 const list=names=>new Intl.ListFormat(en?'en':'nb',{style:'long',type:'conjunction'}).format(names);
 const unnamed=route.filter(r=>!known(r.informant)).length;
 const uncredited=route.filter(r=>!known(r.samler)).length;
 return {
  counts:en?`${route.length} folk legends · ${places.length} places · ${collectors.length} named collectors · ${narrators.length} named narrators`:`${route.length} sagn · ${places.length} steder · ${collectors.length} navngitte samlere · ${narrators.length} navngitte fortellere`,
  places:(en?'Our route through the archive: ':'Vår rute gjennom arkivet: ')+list(places)+'.',
  collectors:(collectors.length?(en?'The records credit ':'Opptegnelsene oppgir ')+list(collectors)+(en?' as collectors.':' som samlere.'):(en?'No collectors are named in these records.':'Ingen samlere er navngitt i disse opptegnelsene.'))+(uncredited?(en?` ${uncredited} of these records ${uncredited===1?'has':'have'} no named collector.`:` ${uncredited} av disse opptegnelsene mangler navngitt samler.`):''),
  narrators:(narrators.length?(en?'We encountered legends told by ':'Vi møtte sagn fortalt av ')+list(narrators)+'.':(en?'No narrators are named in these records.':'Ingen fortellere er navngitt i disse opptegnelsene.'))+(unnamed?(en?` For ${unnamed} of the legends, the narrator is not named in the available metadata.`:` For ${unnamed} av sagnene er fortelleren ikke navngitt i de tilgjengelige metadataene.`):'')
 };
}

// Describe the actual connection, rather than narrating the map animation.
export function continuousBridge(previous,record,link,lang='en',index=0){
 const en=lang==='en',place=record.sted;
 const narrator=known(record.informant)?personName(record.informant):'';
 const collector=known(record.samler)?personName(record.samler):'';
 const samePlace=previous&&!previous.storyPlaces?.length&&((previous.placeId&&previous.placeId===record.placeId)||previous.sted===place);
 let text;
 if(!previous)text=en?`We begin with a folk legend from ${place}.`:`Vi begynner med et sagn fra ${place}.`;
 else if(samePlace)text=en?[`There is another legend from ${place}.`,`This next legend is also from ${place}.`][index%2]:[`Det finnes også et annet sagn fra ${place}.`,`Det neste sagnet er også fra ${place}.`][index%2];
 else if(link?.kind==='collector'&&collector)text=en?`${collector} also collected this legend from ${place}.`:`${collector} samlet også dette sagnet fra ${place}.`;
 else if(link?.kind==='narrator'&&narrator)text=en?`${narrator} also told this legend, associated with ${place}.`:`${narrator} fortalte også dette sagnet, som er knyttet til ${place}.`;
 else if(link?.kind==='story')text=en?`Both legends mention ${link.value}. This record is associated with ${place}.`:`Begge sagnene nevner ${link.value}. Denne opptegnelsen er knyttet til ${place}.`;
 else if(link?.kind==='category'){
  // Alternate what introduces a related legend, not just synonyms for "same type".
  const title=record.tittel?.trim();
  const choices=en?[
   `These two legends share the same legend classification. Our next stop is ${place}.`,
   narrator?`${narrator} told the next legend, associated with ${place}.`:`The next record comes from ${place}.`,
   collector?`A related theme connects this legend with one recorded by ${collector}, from ${place}.`:`A related theme takes us to a legend from ${place}.`,
   title?`The record from ${place} is titled “${title}”.`:`Now a legend from ${place}.`,
   collector?`We can follow the same theme to ${place}, through a legend recorded by ${collector}.`:`From ${previous.sted}, we move to ${place} for the next legend.`
  ]:[
   `Disse to sagnene tilhører samme sagntype. Neste stopp er ${place}.`,
   narrator?`${narrator} fortalte det neste sagnet, som er knyttet til ${place}.`:`Den neste opptegnelsen kommer fra ${place}.`,
   collector?`Et beslektet tema knytter dette sagnet til et fra ${place}, nedtegnet av ${collector}.`:`Et beslektet tema fører oss til et sagn fra ${place}.`,
   title?`Opptegnelsen fra ${place} har tittelen «${title}».`:`Nå et sagn fra ${place}.`,
   collector?`Vi kan følge det samme temaet til ${place}, gjennom et sagn nedtegnet av ${collector}.`:`Fra ${previous.sted} går vi videre til ${place} og det neste sagnet.`
  ];
  text=choices[index%choices.length];
 }
 else text=en?[`The next legend comes from ${place}.`,`Now a folk legend from ${place}.`][index%2]:[`Det neste sagnet kommer fra ${place}.`,`Nå et sagn fra ${place}.`][index%2];
 // A collector already introduced at the previous stop need not be announced again.
 const credits={...record};
 if(previous?.collectorId&&previous.collectorId===record.collectorId)credits.samler='';
 if(previous?.narratorId&&previous.narratorId===record.narratorId)credits.informant='';
 return creditedBridge(text,credits,lang,index);
}
