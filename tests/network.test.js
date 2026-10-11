import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {flattenTypes,selectRecords,UNKNOWN} from '../src/ml-index/statistics.js';
import {buildRelationships,buildHierarchy,relationshipSelection} from '../src/ml-index/network-data.js';
const html=readFileSync(new URL('../build/data/index.html',import.meta.url),'utf8');
const payload=JSON.parse(html.match(/<script[^>]*id="ml-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const rows=flattenTypes(payload.types);
test('all bipartite edges account for each record exactly once, with source-faithful categories',()=>{
 for(const [left,right] of [['county','typeId'],['collector','typeId'],['collector','narrator']]){
  const graph=buildRelationships(rows,left,right,10000);
  assert.equal(graph.represented,rows.length);
  assert.equal(graph.edges.reduce((n,e)=>n+e.recordIds.length,0),rows.length);
  assert.equal(new Set(graph.edges.flatMap(e=>e.recordIds)).size,rows.length);
  for(const edge of graph.edges){const a=graph.nodes.find(n=>n.id===edge.source),b=graph.nodes.find(n=>n.id===edge.target);const selection={kind:'edge',left,right,leftValue:a.value,rightValue:b.value};assert.deepEqual(relationshipSelection(rows,selection).map(r=>r.id).sort(),[...edge.recordIds].sort());}
 }
});
test('top-node limits disclose exact representation and retain full source node counts',()=>{
 const graph=buildRelationships(rows,'collector','typeId',12);
 assert.ok(graph.nodes.length<=24);assert.ok(graph.totalNodes>graph.nodes.length);assert.ok(graph.represented<rows.length);
 assert.equal(graph.represented,new Set(graph.edges.flatMap(e=>e.recordIds)).size);
 for(const edge of graph.edges)assert.ok(graph.nodes.some(n=>n.id===edge.source)&&graph.nodes.some(n=>n.id===edge.target));
});
test('unknown and undated records remain connected and suffix types stay distinct',()=>{
 const undated=selectRecords(rows,{}, {decade:'undated'});
 const graph=buildRelationships(undated,'narrator','typeId',10000);
 assert.equal(graph.represented,undated.length);assert.ok(graph.nodes.some(n=>n.value===UNKNOWN));
 const codes=['ML 6015','ML 6015A'].map(code=>payload.types.find(t=>t.code===code));
 const suffixGraph=buildRelationships(rows,'county','typeId',10000);
 assert.ok(codes.every(t=>suffixGraph.nodes.some(n=>n.field==='typeId'&&n.value===t.id)));
});
test('hierarchy keeps metadata nodes for both full and small selections',()=>{
 const full=buildHierarchy(rows,10000);
 assert.equal(full.represented,rows.length);assert.ok(!full.nodes.some(n=>n.field==='record'));
 assert.equal(full.edges.reduce((n,e)=>n+e.recordIds.length,0),rows.length);
 const type=payload.types.find(t=>t.code==='ML 6015A');
 const small=rows.filter(r=>r.typeId===type.id),graph=buildHierarchy(small,24);
 assert.deepEqual(new Set(graph.nodes.map(n=>n.field)),new Set(['topic','typeId']));
 assert.equal(graph.edges.reduce((n,e)=>n+e.recordIds.length,0),small.length);
 assert.equal(buildHierarchy([],24).nodes.length,0);
});
test('invalid category pairs are rejected',()=>{
 assert.throws(()=>buildRelationships(rows,'county','county'));
 assert.throws(()=>buildRelationships(rows,'made-up','typeId'));
});

test('Free connects only selected metadata categories and retains exact underlying legends',async()=>{
 const {buildFreeNetwork,freeFields}=await import('../src/ml-index/network-data.js');
 const graph=buildFreeNetwork(rows,freeFields);
 assert.equal(graph.represented,1477);assert.equal(graph.nodes.filter(n=>n.field==='record').length,0);
 assert.deepEqual(new Set(graph.nodes.map(n=>n.field)),new Set(freeFields));
 assert.equal(graph.edges.reduce((n,e)=>n+e.recordIds.length,0),rows.length*15);
 for(const edge of graph.edges){const a=graph.nodes.find(n=>n.id===edge.source),b=graph.nodes.find(n=>n.id===edge.target);assert.deepEqual(relationshipSelection(rows,{kind:'edge',left:a.field,right:b.field,leftValue:a.value,rightValue:b.value}).map(r=>r.id),edge.recordIds);}
 const reduced=buildFreeNetwork(rows,['collector','typeId']);assert.equal(reduced.represented,1477);assert.equal(reduced.edges.reduce((n,e)=>n+e.recordIds.length,0),1477);assert.deepEqual(new Set(reduced.nodes.map(n=>n.field)),new Set(['collector','typeId']));
 const defaults=buildFreeNetwork(rows);
 assert.equal(defaults.edges.reduce((n,e)=>n+e.recordIds.length,0),1477*6);
 assert.deepEqual(new Set(defaults.nodes.map(n=>n.field)),new Set(['county','collector','typeId','topic']));
 const pair=buildFreeNetwork(rows,['typeId','topic']);
 assert.deepEqual(new Set(pair.nodes.map(n=>n.field)),new Set(['typeId','topic']));
 assert.equal(pair.edges.reduce((n,e)=>n+e.recordIds.length,0),1477);
 assert.equal(buildFreeNetwork(rows,['year','translated']).nodes.length,0);
 assert.equal(buildFreeNetwork([],freeFields).nodes.length,0);
});
