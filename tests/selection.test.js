import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeSelection,decodeSelection} from '../src/lib/selection.js';
import {nodeConnectionSizes,nodeId} from '../src/ml-index/network-data.js';
const html=readFileSync(new URL('../build/data/index.html',import.meta.url),'utf8');
const payload=JSON.parse(html.match(/<script[^>]*id="ml-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const records=payload.types.flatMap(type=>type.records);
test('compact selections preserve every Norwegian record and accept old comma lists',()=>{
 const ids=records.map(record=>record.id);
 assert.deepEqual(new Set(decodeSelection(encodeSelection(ids),records)),new Set(ids));
 assert.ok(encodeSelection(ids).length<ids.join(',').length);
 assert.deepEqual(new Set(decodeSelection(ids.slice(0,10).join(','),records)),new Set(ids.slice(0,10)));
 assert.deepEqual(decodeSelection('nonexistent,00000~99999',[{id:'53514'},{id:'6015A'}]),['53514']);
});
test('connection sizes include hidden categories without counting duplicate records',()=>{
 const rows=[{id:'1',county:'A',collector:'X',typeId:'T',topic:'P',place:'One'},{id:'2',county:'A',collector:'Y',typeId:'T',topic:'P',place:'Two'},{id:'3',county:'B',collector:'X',typeId:'T',topic:'P',place:'One'}];
 const sizes=nodeConnectionSizes(rows),a=sizes.get(nodeId('county','A')),b=sizes.get(nodeId('county','B'));
 assert.ok(a.connectionCount>b.connectionCount);assert.equal(a.connectionShare,1);
 assert.deepEqual(nodeConnectionSizes([...rows,rows[0]]),sizes);
});
