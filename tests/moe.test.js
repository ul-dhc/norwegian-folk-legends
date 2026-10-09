import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moeRoute,moeScenes,moeIds} from '../src/journey/moe.js';
import {passages,translatedSceneIndex} from '../src/journey/cinema.js';
const source=JSON.parse(readFileSync(new URL('../norske_json/legends.json',import.meta.url)));
const records=source.map(r=>({...r,source_text_id:r.id,tekst:r.text.no,sted:r.placeId}));
test('Moe pilot preserves both complete source texts and collector attribution',()=>{
 const route=moeRoute(records);assert.deepEqual(route.map(r=>r.id),moeIds);
 assert.ok(route.every(r=>r.collectorId==='collector-moltke-moe'));
 const scenes=moeScenes(route,records,r=>passages(r.tekst,50));
 for(const [i,r] of route.entries())assert.equal(scenes.filter(s=>s.kind==='read'&&s.i===i).map(s=>s.text).join(' '),r.tekst.trim().replace(/\s+/gu,' '));
 assert.equal(scenes[0].j,'all');assert.equal(scenes[1].j,'network');assert.equal(scenes.at(-1).kind,'end');
});
test('Moe biography scenes survive locale changes and have finite map coordinates',()=>{
 const scenes=moeScenes(moeRoute(records),records,r=>passages(r.tekst));
 scenes.forEach((s,index)=>{if(s.kind!=='moe')return;assert.equal(translatedSceneIndex(scenes,s),index);assert.ok(s.text.en&&s.text.no);if(s.target&&!s.target.source_text_id)assert.ok(Number.isFinite(s.target.lat)&&Number.isFinite(s.target.lon));});
});
test('archival encounter and notebook preserve original access and correct attribution',()=>{
 const scenes=moeScenes(moeRoute(records),records,r=>passages(r.tekst),{liv:'original.jpg',figures:'cutout.png',manuscript:'page.png'});
 const encounter=scenes.find(s=>s.effect==='encounter');
 assert.equal(encounter.i,0);assert.equal(encounter.image,'original.jpg');assert.equal(encounter.kind,'read');
 assert.ok(scenes.findIndex(s=>s.j==='liv')<scenes.indexOf(encounter));
 assert.ok(scenes.filter(s=>s.kind==='read'&&s.i===0).every(s=>s.effect==='encounter'&&s.image==='original.jpg'));
 const manuscript=scenes.find(s=>s.j==='manuscript');
 assert.equal(manuscript.i,1);assert.equal(manuscript.image,'page.png');assert.match(manuscript.manuscript,/\/4\//);
 assert.equal(scenes.at(-2).j,'archive');assert.equal(scenes.at(-2).manuscript,manuscript.manuscript);
 assert.ok(new Set(scenes.filter(s=>s.kind==='moe').map(s=>s.j)).size===scenes.filter(s=>s.kind==='moe').length);
});

test('cached roads connect every catalogue endpoint and identify ferry routes',()=>{
 const network=JSON.parse(readFileSync(new URL('../src/journey/moe-roads.json',import.meta.url)));
 assert.match(network.description,/not historical travel/);
 assert.ok(network.edges.some(e=>e.kind==='road'));
 assert.ok(network.edges.every(e=>e.kind==='road'));
 assert.ok(network.edges.some(e=>e.includesFerry));
 for(const edge of network.edges){
  assert.deepEqual(edge.path[0],edge.from);assert.deepEqual(edge.path.at(-1),edge.to);
  assert.ok(edge.path.every(p=>p.length===2&&p.every(Number.isFinite)));
  if(edge.kind==='road')assert.ok(edge.path.length>2);
  else assert.equal(edge.path.length,2);
 }
});
