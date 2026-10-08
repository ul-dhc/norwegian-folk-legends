import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compose,routeFromIds,describeRoute,DEMO,normalText,ReadingClock,readingTime,avoidRecentPlaces,links,mapped} from '../src/journey/engine.js';
const {records}=JSON.parse(readFileSync(new URL('../build/journey-data.json',import.meta.url)));
const pilot=JSON.parse(readFileSync(new URL('../src/journey/places.json',import.meta.url)));
test('demo provides varied, evidenced connections and restores identically',()=>{
 const route=routeFromIds(records,DEMO);assert.equal(route.length,5);
 const kinds=describeRoute(route).slice(1).map(x=>x.kind);
 assert.ok(kinds.includes('collector'));assert.ok(new Set(kinds).size>1);
 assert.deepEqual(describeRoute(routeFromIds(records,route.map(r=>r.source_text_id))),describeRoute(route));
});
test('generated journeys have five distinct texts and finite coordinates',()=>{
 let seed=21;const random=()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};
 for(let i=0;i<40;i++){
  const route=compose(records,random);assert.equal(route.length,5);
  assert.equal(new Set(route.map(r=>normalText(r.tekst))).size,5);
  assert.ok(route.every(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon)));
  describeRoute(route).forEach((link,index)=>{
   if(!index||link.kind!=='elsewhere')return;
   const history=route.slice(0,index),used=new Set(history.map(r=>normalText(r.tekst)));
   const fresh=avoidRecentPlaces(records.filter(r=>mapped(r)&&normalText(r.tekst)&&!used.has(normalText(r.tekst))),history);
   assert.ok(!fresh.some(r=>links(history.at(-1),r).length),'Prefer an evidenced link when the place cooldown allows it');
  });
 }
});
test('every pilot quote occurs in its source text',()=>{
 for(const [id,places] of Object.entries(pilot)){
  const record=records.find(r=>r.source_text_id===id);assert.ok(record,id);
  for(const p of places)assert.ok(normalText(record.tekst).includes(normalText(p.quote)),id);
 }
});
test('pause resumes remaining reading time, never advances early',()=>{
 let now=0,callback,count=0,delay;
 const clock=new ReadingClock(()=>count++,{now:()=>now,schedule:(fn,ms)=>{callback=fn;delay=ms;return 1;},cancel:()=>{callback=null;}});
 clock.reset(10000);clock.resume();now=3500;clock.pause();assert.equal(clock.remaining,6500);assert.equal(callback,null);
 now=9000;clock.resume();assert.equal(delay,6500);assert.equal(count,0);callback();assert.equal(count,1);
 clock.reset(4000);clock.resume();clock.stop();assert.equal(callback,null);assert.equal(clock.remaining,0);
});
test('long legends have sufficient auto time and singleton/empty datasets are safe',()=>{
 assert.ok(readingTime('word '.repeat(974))>300000);
 assert.deepEqual(compose([]),[]);assert.equal(compose([records[0]],()=>0).length,1);
 assert.deepEqual(routeFromIds(records,['missing']),[]);
});
test('default timer adapters do not bind browser timer functions to the clock',async()=>{
 const originalSchedule=globalThis.setTimeout,originalCancel=globalThis.clearTimeout;
 try {
  globalThis.setTimeout=function(fn,ms){assert.ok(this===undefined || this===globalThis);return originalSchedule(fn,ms);};
  globalThis.clearTimeout=function(id){assert.ok(this===undefined || this===globalThis);return originalCancel(id);};
  const clock=new ReadingClock(()=>{});clock.reset(1000);clock.resume();clock.pause();assert.ok(clock.remaining>0);
 } finally {globalThis.setTimeout=originalSchedule;globalThis.clearTimeout=originalCancel;}
});

// Cinematic presentation must preserve the whole source at every screen size.
const {passages,passageDuration}=await import('../src/journey/cinema.js');
test('passages preserve every word in every legend without duplication',()=>{
 for(const limit of [8,25,55,90])for(const r of records){
  const pages=passages(r.tekst,limit);
  assert.equal(normalText(pages.map(p=>p.text).join(' ')),normalText(r.tekst));
  assert.ok(pages.every(p=>p.end-p.offset<=limit));
  assert.equal(pages[0].offset,0);
  for(let i=1;i<pages.length;i++)assert.equal(pages[i].offset,pages[i-1].end);
 }
});
test('slower mode extends passage time and empty text is safe',()=>{
 const text='word '.repeat(90);assert.ok(passageDuration(text,true)>passageDuration(text,false));assert.deepEqual(passages(''),[]);
 assert.ok(passageDuration(text)<33000);
 assert.equal(passageDuration('A short legend.'),8000);
});
test('pagination balances a short ending and keeps a fitting legend together',()=>{
 const text=[...Array(5).fill('word '.repeat(17)+'end.'),'A final sentence.'].join(' ');
 const pages=passages(text,90);
 assert.equal(pages.length,2);
 assert.ok(pages.every(p=>p.end-p.offset>=30));
 assert.equal(passages(text,100).length,1);
});

test('continuous routes carry the previous connection across batches and avoid repeats',async()=>{
 const {continueRoute,chooseLink}=await import('../src/journey/engine.js');
 let previous=routeFromIds(records,DEMO).at(-1),seen=new Set([normalText(previous.tekst)]);
 const all=new Set(seen);
 for(let n=0;n<12;n++){
  const batch=continueRoute(records,previous,seen,()=>.5);
  assert.equal(batch.length,5);
  assert.notEqual(chooseLink(previous,batch[0]).kind,'elsewhere');
  for(const r of batch){assert.ok(!all.has(normalText(r.tekst)));all.add(normalText(r.tekst));}
  previous=batch.at(-1);
 }
 const singleton=continueRoute([previous],previous,new Set([normalText(previous.tekst)]));
 assert.equal(singleton.length,5);
 assert.deepEqual(continueRoute([],previous),[]);
});
test('connection trees join every real location without fabricated coordinates',async()=>{
 const {networkEdges}=await import('../src/journey/engine.js');
 const group=records.filter(r=>r.collectorId===records.find(r=>r.samler==='Knut Hermundstad').collectorId);
 const {nodes,edges}=networkEdges(group);
 assert.equal(edges.length,nodes.length-1);
 assert.ok(edges.every(pair=>pair.every(r=>group.includes(r))));
 const reached=new Set([nodes[0]]);for(const [a,b] of edges){assert.ok(reached.has(a));reached.add(b);}assert.equal(reached.size,nodes.length);
 assert.equal(networkEdges([group[0],group[0]]).edges.length,0);
});

test('collector colours are stable and short reading selection excludes long texts',async()=>{
 const {collectorColour,shortEnough}=await import('../src/journey/appearance.js');
 const pool=records.filter(shortEnough);assert.ok(pool.length>100);
 assert.ok(new Set(pool.map(collectorColour)).size>=6);
 for(const r of pool.slice(0,30))assert.equal(collectorColour(r),collectorColour({...r,sted:'Different place'}));
 assert.equal(shortEnough({tekst:Array(181).fill('word').join(' ')}),false);
 assert.equal(shortEnough({tekst:'Short',english_translation:Array(181).fill('word').join(' ')}),false);
 const route=compose(pool);assert.ok(route.every(shortEnough));
 const next=(await import('../src/journey/engine.js')).continueRoute(pool,route.at(-1),new Set(route.map(r=>normalText(r.tekst))));assert.ok(next.every(shortEnough));
});

test('road sampling follows bends and preserves exact endpoints',async()=>{
 const {pathSampler,roadPath}=await import('../src/journey/roads.js');
 const sample=pathSampler([[0,0],[0,1],[1,1]]);
 assert.deepEqual(sample(0),[0,0]);assert.deepEqual(sample(1),[1,1]);
 assert.deepEqual(sample(.5),[0,1]);assert.deepEqual(sample(.75),[.5,1]);
 assert.equal(await roadPath([0,0],[10,10],500000),null);
});

test('road eligibility stays within a known collector thread',async()=>{
 const {sameCollectorThread}=await import('../src/journey/roads.js');
 assert.equal(sameCollectorThread({collectorId:'A'},{collectorId:'A'}),true);
 assert.equal(sameCollectorThread({collectorId:'A'},{collectorId:'B'}),false);
 assert.equal(sameCollectorThread({},{}),false);
 assert.equal(sameCollectorThread(null,{collectorId:'A'}),false);
});

test('collector overviews do not repeat within or between continuous batches',async()=>{
 const {networkScenes}=await import('../src/journey/cinema.js');
 const route=[{collectorId:'knut'},{collectorId:'knut'},{collectorId:'other'},{collectorId:'knut',narratorId:'voice'}];
 const links=[{kind:'collector'},{kind:'collector'},{kind:'collector'},{kind:'narrator'}];
 const history=new Set();const first=networkScenes(route,links,history);
 assert.deepEqual(first.map(s=>s.networkKey),['collector:knut','collector:other','narrator:voice']);
 assert.equal(history.size,0);
 assert.deepEqual(networkScenes(route,links,history),first,'resizing keeps the same scene plan');
 first.forEach(s=>history.add(s.networkKey));
 assert.deepEqual(networkScenes(route,links,history),[],'next batch does not repeat an overview');
 assert.equal(networkScenes(route,links,new Set()).length,3,'new journey resets overviews');
});

test('Wittenberg cases are excluded from new and restored journeys',async()=>{
 const {journeyEligible}=await import('../src/journey/appearance.js');
 const pool=records.filter(journeyEligible);
 assert.ok(!pool.some(r=>/wittenberg/iu.test(r.tekst+' '+r.english_translation)));
 assert.equal(routeFromIds(pool,['SIN1','SIN115']).length,0);
 assert.equal(routeFromIds(pool,DEMO).length,5);
});

test('consecutive Vestre Slidre records stay in place instead of announcing another arrival',async()=>{
 const {samePlaceBridge}=await import('../src/journey/cinema.js');
 const a=records.find(r=>r.source_text_id==='SIN439'),b=records.find(r=>r.source_text_id==='SIN306');
 assert.equal(samePlaceBridge(a,b,'en',0),'We stay in Vestre Slidre for another legend.');
 assert.match(samePlaceBridge(a,b,'no',0),/^Vi blir i Vestre Slidre/);
 assert.notEqual(samePlaceBridge(a,b,'en',0),samePlaceBridge(a,b,'en',1));
 assert.equal(samePlaceBridge(records.find(r=>r.source_text_id==='SIN204'),b),null);
 assert.equal(samePlaceBridge({...a,storyPlaces:[{name:'Elsewhere'}]},b),null);
});

test('language switching keeps the scene and handles different translation lengths',async()=>{
 const {translatedSceneIndex}=await import('../src/journey/cinema.js');
 const scenes=[{kind:'introduction',i:0,j:0},{kind:'introduction',i:0,j:1},{kind:'travel',i:0},{kind:'read',i:0,p:0,total:1},{kind:'story-travel',i:0,j:0}];
 assert.equal(translatedSceneIndex(scenes,{kind:'travel',i:0}),2);
 assert.equal(translatedSceneIndex(scenes,{kind:'read',i:0,p:3,total:4,offset:240}),3);
 assert.equal(translatedSceneIndex(scenes,{kind:'introduction',i:0,j:1}),1);
 assert.equal(translatedSceneIndex(scenes,{kind:'story-travel',i:0,j:0}),4);
});

test('place cooldown prevents return trips across journey batches',async()=>{
 const {continueRoute,avoidRecentPlaces}=await import('../src/journey/engine.js');
 const make=(place,n)=>({placeId:place,lat:60+n,lon:10,tekst:`Story ${place} ${n}`,collectorId:'collector',samler:'Collector'});
 const pool=Array.from({length:12},(_,n)=>make(`place-${n}`,n));
 const history=pool.slice(0,6),visited=new Set(history.map(r=>normalText(r.tekst)));
 // Fresh texts from recently visited places must not bypass the place cooldown.
 pool.push({...history[0],tekst:'Another Elverum telling'},{...history[4],tekst:'Another recent telling'});
 const next=continueRoute(pool,history.at(-1),visited,()=>0,history);
 const journey=[...history,...next];
 for(let i=6;i<journey.length;i++)assert.ok(!journey.slice(i-6,i).some(r=>r.placeId===journey[i].placeId));
 assert.deepEqual(avoidRecentPlaces([history[0],history[5]],history),[history[0]]);
 assert.deepEqual(avoidRecentPlaces([],history),[]);
 const alias={...history[5],placeId:'different-catalogue-id'};
 assert.deepEqual(avoidRecentPlaces([alias,pool[6]],history),[pool[6]]);
});

test('new collector threads contrast and continuous threads retain their colour',async()=>{
 const {colourThreads,collectorColour}=await import('../src/journey/appearance.js');
 const previous={collectorId:'previous',journeyColour:collectorColour({collectorId:'new'})};
 const next=colourThreads([{collectorId:'new'},{collectorId:'new'}],previous);
 assert.equal(collectorColour(next[0]),collectorColour(next[1]));
 assert.notEqual(collectorColour(next[0]),collectorColour(previous));
 assert.deepEqual(colourThreads([{collectorId:'new'},{collectorId:'new'}],previous),next);
 assert.equal(collectorColour(colourThreads([{collectorId:'new'}],next[1])[0]),collectorColour(next[1]));
});

test('map types change only background styling and restore terrain layers',async()=>{
 const {applyMapType}=await import('../src/journey/terrain-style.js');
 const layers=['ground','relief','water','road'].map(id=>({id,'source-layer':id==='road'?'transportation':id==='water'?'water':undefined})),visibility={},paint={};
 const map={getStyle:()=>({layers}),setLayoutProperty:(id,key,value)=>{visibility[id]=value;},setPaintProperty:(id,key,value)=>{paint[id]=value;}};
 applyMapType(map,'coastlines');assert.equal(visibility.water,'visible');
 for(const id of ['relief','road'])assert.equal(visibility[id],'none');
 applyMapType(map,'quiet');assert.equal(visibility.relief,'none');assert.equal(visibility.water,'visible');assert.equal(visibility.road,'visible');
 applyMapType(map,'terrain');assert.equal(visibility.relief,'visible');assert.equal(paint.ground,'#202D3C');
 applyMapType(map,'borders');assert.equal(visibility.relief,'none');assert.equal(visibility.road,'none');assert.equal(paint.ground,'#152131');
});

test('themed journeys stay in one category, visit distinct places, and use complete short texts',async()=>{
 const {THEMES,themeRoute}=await import('../src/journey/themes.js');
 for(const [key,theme]of Object.entries(THEMES)){
  const route=themeRoute(records,key);assert.equal(route.length,{water:15,hulder:12,boundary:9}[key],key);
  assert.equal(route.length,theme.stops.length);
  assert.equal(new Set(route.map(r=>`${r.lat},${r.lon}`)).size,route.length);
  assert.ok(route.every(r=>r.ml_code===theme.code&&r.journeyColour===theme.colour));
  assert.ok(new Set(route.map(r=>r.collectorId)).size>=3);
  assert.deepEqual(themeRoute(records,key),route);
  for(const r of route)assert.equal(r.tekst,records.find(x=>x.source_text_id===r.source_text_id).tekst);
  assert.deepEqual(themeRoute(records.filter(r=>r.source_text_id!==theme.stops[0].id),key),[]);
 }
 const duplicatePlace=records.map(r=>r.source_text_id===THEMES.water.stops[1].id?{...r,lat:themeRoute(records,'water')[0].lat,lon:themeRoute(records,'water')[0].lon}:r);
 assert.deepEqual(themeRoute(duplicatePlace,'water'),[]);
 assert.deepEqual(themeRoute(records,'unknown'),[]);
});

test('journey credits use known names without duplicates and summaries describe only visited records',async()=>{
 const {creditedBridge,journeySummary,personName}=await import('../src/journey/credits.js');
 assert.equal(personName('Ragna I. Haugen, f. 1840, d. 1937'),'Ragna I. Haugen');
 const route=[{sted:'Bø',samler:'Moltke Moe',informant:'Liv Bratterud'},{sted:'Bø',samler:'Moltke Moe',informant:'Ukjent'},{sted:'Vang',samler:'',informant:'Liv Bratterud'}];
 const text=creditedBridge('Liv Bratterud shares a legend.',route[0]);
 assert.equal(text.match(/Liv Bratterud/g).length,1);assert.match(text,/Moltke Moe/);
 assert.equal(creditedBridge('A legend.',{samler:'',informant:'Ukjent'}),'A legend.');
 const summary=journeySummary(route);
 assert.equal(summary.counts,'3 folk legends · 2 places · 1 named collectors · 1 named narrators');
 assert.match(summary.narrators,/For 1 of the legends/);assert.match(summary.collectors,/1 of these records/);
 assert.equal(summary.places,'Our route through the archive: Bø and Vang.');
 assert.match(journeySummary(route,'no').counts,/3 sagn/);
});

test('archive insights describe geographic evidence and do not repeat used observations',async()=>{
 const {insightCandidates,chooseInsight}=await import('../src/journey/insights.js');
 const r=Array.from({length:4},(_,i)=>({collectorId:'a',samler:'A',informant:i?'Ukjent':'N',sted:'Place',lat:60,lon:10,ml_code:'type',ml_title:'Topic'}));
 const candidates=insightCandidates(r,r[0]);
 assert.ok(candidates.some(x=>x.key==='local:a'&&x.en.includes('one mapped location')));
 const first=chooseInsight(candidates,new Set(),null);assert.ok(first);
 const next=chooseInsight(candidates,new Set([first.key]),first.kind);assert.notEqual(next.kind,first.kind);
 assert.equal(chooseInsight(candidates,new Set(candidates.map(x=>x.key)),null),null);
 const wide=insightCandidates(r.map((x,i)=>({...x,lat:60+i*3,sted:`Place ${i}`})),r[0]);
 assert.ok(wide.some(x=>x.key==='reach:a'&&x.en.includes('not evidence of a journey')));
 const question=chooseInsight(wide,new Set(),null,true);
 assert.match(question.en,/Did you know.*4 named places/);
 assert.match(question.no,/Visste du.*4 navngitte steder/);
 assert.equal(question.key,'reach:a');
 assert.equal(chooseInsight([question],new Set([question.key]),null,true),null);
 assert.ok(!chooseInsight(wide,new Set(),null).en.includes('?'));
 assert.ok(!candidates.some(x=>x.en.includes('named narrators')));
});

test('fresh journeys choose different opening places while saved routes retain their order',()=>{
 const pool=records.filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lon));
 const first=compose(pool,()=>.1),second=compose(pool,()=>.1,[first[0]]);
 assert.notEqual(`${first[0].lat},${first[0].lon}`,`${second[0].lat},${second[0].lon}`);
 assert.notDeepEqual(first.map(r=>r.source_text_id),compose(pool,()=>.8).map(r=>r.source_text_id));
 assert.deepEqual(routeFromIds(pool,first.map(r=>r.source_text_id)).map(r=>r.source_text_id),first.map(r=>r.source_text_id));
});

test('category introductions cycle through facts rather than repeating the type announcement',async()=>{
 const {continuousBridge}=await import('../src/journey/credits.js');
 const before={sted:'Bø',placeId:'bo'},record={sted:'Vang',placeId:'vang',samler:'Collector',informant:'Narrator',tittel:'Legend title'};
 for(const lang of ['en','no']){
  const lines=Array.from({length:5},(_,i)=>continuousBridge(before,record,{kind:'category'},lang,i));
  assert.equal(new Set(lines).size,5);
  assert.equal(lines.filter(s=>lang==='en'?s.includes('legend classification'):s.includes('samme sagntype')).length,1);
  assert.ok(lines.every(s=>s.includes('Vang')));
  assert.equal(continuousBridge(before,record,{kind:'category'},lang,2),lines[2]);
  assert.match(lines[2],lang==='en'?/related theme.*recorded by Collector/:/beslektet tema.*nedtegnet av Collector/);
  assert.equal(lines[2].split('Collector').length-1,1);
  assert.ok(!continuousBridge(before,record,{kind:'elsewhere'},lang,2).includes(lang==='en'?'related theme':'beslektet tema'));
  assert.ok(!lines.some(s=>/landscape stays|unfold|we find another/i.test(s)));
 }
});
