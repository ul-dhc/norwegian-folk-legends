// Divide the complete source into passages, preferring sentence boundaries.
// Only whitespace changes. No excerpts, generated prose or omitted endings.
export function passages(text,limit=85){
 const words=(text||'').trim().split(/\s+/u).filter(Boolean),result=[];
 limit=Math.max(8,Math.floor(limit));
 for(let start=0;start<words.length;){
  const remaining=words.length-start,pagesLeft=Math.ceil(remaining/limit);
  let end=words.length;
  if(pagesLeft>1){
   // Balance the remaining screens instead of filling one and leaving a tiny tail.
   const target=start+Math.round(remaining/pagesLeft);
   const minimum=Math.max(start+1,words.length-(pagesLeft-1)*limit,start+Math.floor((target-start)*.7));
   const maximum=Math.min(start+limit,words.length-(pagesLeft-1)*Math.ceil((target-start)*.7));
   end=Math.max(minimum,Math.min(maximum,target));
   let nearest=Infinity;
   for(let i=minimum;i<=maximum;i++)if(/[.!?][”»"')]*$/u.test(words[i-1])&&Math.abs(i-target)<nearest){end=i;nearest=Math.abs(i-target);}
  }
  result.push({text:words.slice(start,end).join(' '),offset:start,end});start=end;
 }
 return result;
}
export function passageDuration(text,slow=false){return Math.max(slow?12000:8000,text.trim().split(/\s+/u).filter(Boolean).length/(slow?105:185)*60000+(slow?4500:2500));}

// Show each person's overview once per journey; rebuilding a batch is deterministic.
export function networkScenes(route,links,previouslyShown=new Set()){
 const used=new Set(previouslyShown);
 return route.flatMap((record,i)=>{
  const kind=links[i]?.kind;
  if(kind!=='collector'&&kind!=='narrator')return [];
  const id=record[kind==='collector'?'collectorId':'narratorId'];
  if(!id)return [];
  const networkKey=kind+':'+id;if(used.has(networkKey))return [];
  used.add(networkKey);return [{kind,i,networkKey}];
 });
}

// An archival relationship does not necessarily mean a change of landscape.
export function samePlaceBridge(previous,record,language='en',index=0){
 if(!previous||!record||previous.storyPlaces?.length)return null;
 const same=previous.placeId&&record.placeId
  ?previous.placeId===record.placeId
  :Boolean(previous.sted?.trim()&&previous.sted.trim().toLocaleLowerCase()===record.sted?.trim().toLocaleLowerCase());
 if(!same)return null;
 const lines=language==='en'
  ?[`We stay in ${record.sted} for another legend.`, 'This next legend comes from the same place.', 'There is another local legend to read.']
  :[`Vi blir i ${record.sted}. Herfra finnes også et annet sagn.`, 'Det neste sagnet kommer fra samme sted.', 'Herfra finnes det enda et sagn.'];
 return lines[index%lines.length];
}

// Translations have different word counts; retain the relative passage position.
export function translatedSceneIndex(scenes,previous){
 const candidates=scenes.map((s,index)=>({s,index})).filter(({s})=>s.i===previous.i&&s.kind===previous.kind);
 if(previous.kind==='read'){
  const position=(previous.p||0)/Math.max(1,previous.total||1);
  return candidates[Math.min(candidates.length-1,Math.floor(position*candidates.length))]?.index??-1;
 }
 return candidates.find(({s})=>s.j===previous.j)?.index??-1;
}
