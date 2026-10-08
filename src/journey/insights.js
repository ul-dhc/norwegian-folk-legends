import {known,mapped} from './engine.js';
import {personName} from './credits.js';
const unique=(records,key)=>[...new Set(records.map(r=>r[key]).filter(known))];
const kilometres=(a,b)=>{
 const rad=Math.PI/180,dlat=(b.lat-a.lat)*rad,dlon=(b.lon-a.lon)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
};
function extent(records){
 const points=[...new Map(records.filter(r=>mapped(r)&&known(r.sted)&&r.precision!=='region').map(r=>[`${r.lat},${r.lon}`,r])).values()];
 let distance=0,pair=[];
 for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
  const d=kilometres(points[i],points[j]);if(d>distance){distance=d;pair=[points[i],points[j]];}
 }
 return {points,distance,pair};
}
// Every observation is limited to the platform's records, not a biography or
// reconstructed collecting itinerary. Never infer subject matter from keywords.
export function insightCandidates(records,record){
 const result=[],add=(key,kind,en,no)=>result.push({key,kind,en,no});
 const group=record.collectorId&&known(record.samler)?records.filter(r=>r.collectorId===record.collectorId):[];
 if(group.length>=4){
  const name=personName(record.samler),geo=extent(group),places=unique(group,'sted');
  const located=group.every(r=>mapped(r)&&known(r.sted)&&r.precision!=='region');
  if(located&&geo.points.length===1)add(`local:${record.collectorId}`,'geography',`All ${group.length} records attributed to ${name} in this collection share one mapped location: ${places[0]}. A single place can hold many legends.`,`Alle ${group.length} opptegnelsene tilskrevet ${name} i denne samlingen har samme kartplassering: ${places[0]}. Ett sted kan romme mange sagn.`);
  else if(located&&geo.distance<=150&&geo.pair.length)add(`local:${record.collectorId}`,'geography',`${name}’s records here are concentrated in a small area. Even ${geo.pair[0].sted} and ${geo.pair[1].sted}, the two most distant mapped locations, are less than 150 kilometres apart.`,`Opptegnelsene etter ${name} er her samlet innenfor et lite område. Selv ${geo.pair[0].sted} og ${geo.pair[1].sted}, de to kartplasseringene som ligger lengst fra hverandre, har under 150 kilometer mellom seg.`);
  else if(geo.distance>=250)add(`reach:${record.collectorId}`,'geography',`The records attributed to ${name} span a wider area: ${geo.pair[0].sted} and ${geo.pair[1].sted} are about ${Math.round(geo.distance/50)*50} kilometres apart in a straight line. These are places associated with the records, not evidence of a journey between them.`,`Opptegnelsene tilskrevet ${name} dekker et større område: ${geo.pair[0].sted} og ${geo.pair[1].sted} ligger omtrent ${Math.round(geo.distance/50)*50} kilometer fra hverandre i luftlinje. Dette er steder knyttet til opptegnelsene, ikke dokumentasjon på en reise mellom dem.`);
  const types=new Map();for(const r of group)if(known(r.ml_code)&&known(r.ml_title)){const item=types.get(r.ml_code)||{name:r.ml_title,count:0};item.count++;types.set(r.ml_code,item);}
  const ranked=[...types.values()].sort((a,b)=>b.count-a.count);
  if(ranked.length>=3)add(`range:${record.collectorId}`,'topics',`${name}’s records include ${types.size} legend types. Among them are “${ranked[0].name}” and “${ranked[1].name}”: the collecting work represented here covers more than one subject.`,`Opptegnelsene etter ${name} omfatter ${types.size} sagntyper. Blant dem er «${ranked[0].name}» og «${ranked[1].name}»: innsamlingsarbeidet som er representert her, dekker flere emner.`);
  const named=group.filter(r=>known(r.informant)).length;
  if(named>0&&named<group.length)add(`voices:${record.collectorId}`,'voices',`${named} of the ${group.length} records attributed to ${name} name a narrator. In the others, the available metadata does not say who told the legend.`,`${named} av de ${group.length} opptegnelsene tilskrevet ${name} oppgir en forteller. I de øvrige sier ikke de tilgjengelige metadataene hvem som fortalte sagnet.`);
  for(const observation of result){
   if(observation.kind==='geography'&&geo.pair.length&&places.length>=2&&geo.distance>=10)observation.question={
    en:`Did you know that this collection includes legends from ${places.length} named places attributed to ${name}? They include ${geo.pair[0].sted} and ${geo.pair[1].sted}, about ${Math.round(geo.distance/10)*10} kilometres apart in a straight line.`,
    no:`Visste du at denne samlingen inneholder sagn fra ${places.length} navngitte steder tilskrevet ${name}? Blant dem er ${geo.pair[0].sted} og ${geo.pair[1].sted}, omtrent ${Math.round(geo.distance/10)*10} kilometer fra hverandre i luftlinje.`
   };
   if(observation.kind==='topics')observation.question={
    en:`What kinds of legends did ${name} collect? The records here cover ${types.size} legend types, including “${ranked[0].name}” and “${ranked[1].name}”.`,
    no:`Hva slags sagn samlet ${name}? Opptegnelsene her omfatter ${types.size} sagntyper, blant annet «${ranked[0].name}» og «${ranked[1].name}».`
   };
   if(observation.kind==='voices')observation.question={
    en:`Who told the legends recorded by ${name}? ${named} of the ${group.length} records here name a narrator. For the others, that name is missing from the available information.`,
    no:`Hvem fortalte sagnene som ${name} skrev ned? ${named} av de ${group.length} opptegnelsene her oppgir en forteller. For de øvrige mangler navnet i de tilgjengelige opplysningene.`
   };
  }
 }
 if(known(record.ml_code)&&known(record.ml_title)){
  const family=records.filter(r=>r.ml_code===record.ml_code),places=unique(family.filter(mapped),'sted');
  if(places.length>=3)add(`type:${record.ml_code}`,'distribution',`“${record.ml_title}” is represented by ${family.length} records associated with ${places.length} mapped places in this collection. The same legend type appears in different local settings.`,`«${record.ml_title}» er representert med ${family.length} opptegnelser knyttet til ${places.length} kartfestede steder i denne samlingen. Den samme sagntypen finnes i forskjellige lokale omgivelser.`);
  if(places.length>=3)result.at(-1).question={
   en:`How widely is this legend type represented here? “${record.ml_title}” appears in ${family.length} records associated with ${places.length} mapped places in this collection.`,
   no:`Hvor mange steder er denne sagntypen representert her? «${record.ml_title}» finnes i ${family.length} opptegnelser knyttet til ${places.length} kartfestede steder i denne samlingen.`
  };
 }
 return result;
}
export function chooseInsight(candidates,used,lastKind,askQuestion=false){
 const chosen=candidates.find(c=>!used.has(c.key)&&c.kind!==lastKind);
 if(!chosen)return null;
 return askQuestion&&chosen.question?{...chosen,...chosen.question}:chosen;
}
