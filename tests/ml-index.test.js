import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const html=read('build/ml-index/index.html');
const payload=JSON.parse(html.match(/<script[^>]*id="ml-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const source=JSON.parse(read('norske_json/legends.json'));
test('the published index accounts for every source record exactly once',()=>{
 const ids=payload.types.flatMap(t=>t.records.map(r=>r.sourceTextId));
 assert.equal(ids.length,source.length);
 assert.equal(new Set(ids).size,source.length);
 assert.deepEqual([...ids].sort(),source.map(r=>r.id).sort());
 for(const type of payload.types){assert.ok(payload.topics.some(topic=>topic.id===type.topic));assert.equal(type.records.length,source.filter(r=>r.mlCategoryId===type.id).length);}
});
test('letter suffixes and the unsuffixed dataset code retain their source classification',()=>{
 const byCode=code=>payload.types.find(t=>t.code===code);
 assert.equal(byCode('ML 6015').records.length,44);
 assert.equal(byCode('ML 6015A').records.length,6);
 assert.equal(byCode('ML 6070').records.length,21);
 assert.equal(byCode('ML 6070A'),undefined);
 assert.equal(byCode('ML 6070B'),undefined);
 assert.equal(new Set([...byCode('ML 6015').records,...byCode('ML 6015A').records].map(r=>r.id)).size,50);
});
test('research records retain source links and manuscript references',()=>{
 const originalById=new Map(source.map(r=>[r.id,r]));
 for(const type of payload.types)for(const row of type.records){const original=originalById.get(row.sourceTextId);assert.equal(row.sourceUrl,original.sourceUrl);assert.equal(row.archiveSignature,original.archiveSignature||'');}
});

const {flattenTypes,selectRecords,countsBy,selectionLink,UNKNOWN}=await import('../src/ml-index/statistics.js');
const records=flattenTypes(payload.types);
test('dashboard cross-filters preserve the intersection of source type, county and date',()=>{
 const category=payload.types.find(type=>type.code==='ML 6015');
 const scope={topic:category.topic,type:category.id};
 const candidates=records.filter(row=>row.typeId===category.id&&row.year);
 const example=candidates[0];
 const decade=String(Math.floor(Number(example.year)/10)*10);
 const result=selectRecords(records,scope,{county:example.county,decade});
 const countyId=source.find(row=>row.id===example.sourceTextId).countyId;
 const expected=source.filter(row=>row.mlCategoryId===category.id&&row.countyId===countyId&&row.year&&String(Math.floor(row.year/10)*10)===decade).map(row=>row.id).sort();
 assert.deepEqual(result.map(row=>row.sourceTextId).sort(),expected);
});
test('unknown people and undated records remain selectable and facet counts conserve records',()=>{
 const unknown=selectRecords(records,{}, {narrator:UNKNOWN,decade:'undated'});
 const expected=source.filter(row=>(!row.informantId||row.informantId==='informant-ukjent')&&!row.year).map(row=>row.id).sort();
 assert.deepEqual(unknown.map(row=>row.sourceTextId).sort(),expected);
 for(const field of ['topic','typeId','county','collector','decade','translation'])assert.equal([...countsBy(unknown,field).values()].reduce((sum,count)=>sum+count,0),unknown.length);
});
test('facet alternatives omit only their own constraint and exact explorer handoff retains IDs',()=>{
 const type=payload.types.find(type=>type.code==='ML 6015A');
 const scope={topic:type.topic,type:type.id};
 const county=type.records[0].county;
 const filtered=selectRecords(records,scope,{county});
 const alternatives=selectRecords(records,scope,{county},'county');
 assert.equal(alternatives.length,type.records.length);
 assert.ok(filtered.length<alternatives.length);
 const url=new URL(selectionLink('/norwegian-folk-legends/',filtered),'https://example.org');
 assert.deepEqual(url.searchParams.get('selection').split(','),filtered.map(row=>row.id));
 assert.equal(selectRecords(records,scope,{county:'missing-county'}).length,0);
});
