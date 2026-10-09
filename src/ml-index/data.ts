import { mlCategories, browseRecords, legendsById } from '../lib/data';
import labels from './labels.json';
export const topics = [
 {id:'magic',min:3000,max:3025,no:'Svarteboka og de lærde',en:'The Black Book and the experts'},
 {id:'witchcraft',min:3030,max:3080,no:'Trolldom og hekser',en:'Witches and witchcraft'},
 {id:'ghosts',min:4000,max:4035,no:'Sjelen og de døde',en:'Souls, ghosts and revenants'},
 {id:'water',min:4050,max:4095,no:'Vann og sjø',en:'Rivers, lakes and the sea'},
 {id:'trolls',min:5000,max:5020,no:'Troll og kjemper',en:'Trolls and giants'},
 {id:'fairies',min:5050,max:6070,no:'Huldrefolk',en:'Fairies and huldrefolk'},
 {id:'nisse',min:7000,max:7020,no:'Nisse og gardvord',en:'Domestic spirits'},
 {id:'local',min:7050,max:8025,no:'Steder, hendelser og personer',en:'Places, events and people'},
];
export const types = mlCategories.map(category=>{
 const number=Number(category.code.match(/\d+/)?.[0]);
 const records=browseRecords.filter(r=>r.mlCategoryId===category.id).map(r=>({id:r.id,sourceTextId:r.sourceTextId,county:r.county,collector:r.collector,narrator:r.narrator,year:r.year,archiveSignature:legendsById.get(r.id)?.archiveSignature||'',sourceUrl:legendsById.get(r.id)?.sourceUrl||''}));
 return {id:category.id,code:category.code.toUpperCase().replace('ML','ML '),no:category.title||category.code,en:(labels as Record<string,string>)[category.code.toLowerCase()]||'',topic:topics.find(t=>number>=t.min&&number<=t.max)?.id||'local',records};
}).sort((a,b)=>a.code.localeCompare(b.code,'en',{numeric:true}));
