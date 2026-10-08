import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {moeRoute,moeScenes,moeIds} from '../src/journey/moe.js';
import {passages,translatedSceneIndex} from '../src/journey/cinema.js';
const source=JSON.parse(readFileSync(new URL('../norske_json/legends.json',import.meta.url)));
const records=source.map(r=>({...r,source_text_id:r.id,tekst:r.text.no,sted:r.placeId}));
test('Moe pilot preserves all five complete source texts and collector attribution',()=>{
 const route=moeRoute(records);assert.deepEqual(route.map(r=>r.id),moeIds);
 assert.ok(route.every(r=>r.collectorId==='collector-moltke-moe'));
 const scenes=moeScenes(route,records,r=>passages(r.tekst,50));
 for(const [i,r] of route.entries())assert.equal(scenes.filter(s=>s.kind==='read'&&s.i===i).map(s=>s.text).join(' '),r.tekst.trim().replace(/\s+/gu,' '));
 assert.equal(scenes[0].j,'all');assert.equal(scenes[1].j,'network');assert.equal(scenes.at(-1).kind,'end');
});
test('Moe biography scenes survive locale changes and have finite map coordinates',()=>{
 const scenes=moeScenes(moeRoute(records),records,r=>passages(r.tekst));
 scenes.forEach((s,index)=>{if(s.kind!=='moe')return;assert.equal(translatedSceneIndex(scenes,s),index);assert.ok(s.text.en&&s.text.no);if(s.target&&s.j!=='legend-'+s.i)assert.ok(Number.isFinite(s.target.lat)&&Number.isFinite(s.target.lon));});
});
