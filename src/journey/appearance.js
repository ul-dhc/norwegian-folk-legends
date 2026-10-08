// Default identity colour, with a contrast-aware override for journey threads.
export const collectorPalette=['#D2B957','#56B4DE','#CC76A5','#58C4B0','#A18BD0','#DF907B'];
export function collectorColour(record){
 if(record?.journeyColour)return record.journeyColour;
 const key=record?.collectorId;if(!key)return '#9CAAB9';
 let hash=2166136261;for(const char of String(key)){hash^=char.codePointAt(0);hash=Math.imul(hash,16777619);}
 return collectorPalette[(hash>>>0)%collectorPalette.length];
}
export const shortEnough=record=>[record.tekst,record.english_translation].filter(Boolean).every(text=>text.trim().split(/\s+/u).length<=180);

// Curatorial exclusion applies only to the journey, including restored routes.
export const journeyEligible=record=>!(/wittenberg/iu.test([record.tekst,record.english_translation,...(record.storyPlaces||[]).map(p=>p.name)].join(" ")));

function hue(hex){
 const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;
 if(!d)return 0;
 return ((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;
}
const hueDistance=(a,b)=>{const d=Math.abs(hue(a)-hue(b));return Math.min(d,360-d);};
// Colour follows a continuous collector thread; a new thread must contrast with it.
export function colourThreads(route,previous=null){
 let last=previous;
 return route.map(record=>{
  const preferred=collectorColour({...record,journeyColour:undefined});
  let colour=preferred;
  if(last){
   const prior=collectorColour(last);
   if(record.collectorId&&record.collectorId===last.collectorId)colour=prior;
   else if(hueDistance(preferred,prior)<75){
    colour=[...collectorPalette].sort((a,b)=>hueDistance(b,prior)-hueDistance(a,prior))[0];
   }
  }
  last={...record,journeyColour:colour};return last;
 });
}
