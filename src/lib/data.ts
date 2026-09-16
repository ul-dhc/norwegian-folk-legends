import legendsRaw from '../../norske_json/legends.json';
import collectorsRaw from '../../norske_json/collectors.json';
import informantsRaw from '../../norske_json/informants.json';
import placesRaw from '../../norske_json/places.json';
import countiesRaw from '../../norske_json/counties.json';
import categoriesRaw from '../../norske_json/ml-categories.json';

export type Localized={no:string|null;en:string|null};
export type Legend={id:string;sourceTextId:string;volume:string;chapter:Localized;title:Localized;text:Localized;collectorId:string|null;narratorId:string|null;placeId:string|null;countyId:string|null;mlCategoryId:string|null;genre:string|null;subgenre:string|null;year:string;originalMetadata:string|null;comments:string|null;notes:string|null;originalCoordinates:{latitude:number;longitude:number}|null;primarySourceRaw:string|null;secondarySourceRaw:string|null;archiveSignature:string|null;textSignature:string|null;sourceUrl:string|null};
type Person={id:string;fullName:string;legendCount:number};
type Place={id:string;name:string;coordinates:{latitude:number;longitude:number}|null;legendCount:number};
type Category={id:string;code:string;title:string|null;legendCount:number};
type RawLegend={id:string;title:Localized;text:Localized;mlCategoryId:string|null;genre:string|null;subgenre:string|null;collectorId:string|null;informantId:string|null;placeId:string|null;countyId:string|null;year:number|null;yearRaw:string|null;archiveSignature:string|null;textSignature:string|null;sourceUrl:string|null};
type Source={id:string;title:string|null;originalLabel:string|null;code:string|null};

const indexById=<T extends{id:string}>(items:T[])=>new Map(items.map(item=>[item.id,item]));
export const collectors:Person[]=(collectorsRaw as Array<{id:string;name:string;legendCount:number}>).map(item=>({id:item.id,fullName:item.name,legendCount:item.legendCount}));
export const narrators:Person[]=(informantsRaw as Array<{id:string;name:string;legendCount:number}>).map(item=>({id:item.id,fullName:item.name,legendCount:item.legendCount}));
export const places=placesRaw as Place[],counties=countiesRaw as Place[],mlCategories=categoriesRaw as Category[],sources:Source[]=[],legendSources:never[]=[];
export const collectorsById=indexById(collectors),narratorsById=indexById(narrators),placesById=indexById(places),countiesById=indexById(counties),categoriesById=indexById(mlCategories),sourcesById=indexById(sources);
export const manifest={mode:'full-dataset',legendCount:(legendsRaw as RawLegend[]).length};
const sourceRecordId=(raw:RawLegend)=>{const id=raw.sourceUrl?.match(/[?&]id=(\d+)/)?.[1];if(!id)throw new Error(`Missing UiO record ID for ${raw.id}`);return id};

export const legends:Legend[]=(legendsRaw as RawLegend[]).map(raw=>{const category=raw.mlCategoryId?categoriesById.get(raw.mlCategoryId):null,place=raw.placeId?placesById.get(raw.placeId):null,label=[category?.code,category?.title].filter(Boolean).join(' · ')||null;return{id:sourceRecordId(raw),sourceTextId:raw.id,volume:raw.subgenre||'',chapter:{no:label,en:label},title:raw.title,text:raw.text,collectorId:raw.collectorId,narratorId:raw.informantId,placeId:raw.placeId,countyId:raw.countyId,mlCategoryId:raw.mlCategoryId,genre:raw.genre,subgenre:raw.subgenre,year:String(raw.year||''),originalMetadata:null,comments:null,notes:null,originalCoordinates:place?.coordinates||null,primarySourceRaw:raw.archiveSignature,secondarySourceRaw:raw.textSignature,archiveSignature:raw.archiveSignature,textSignature:raw.textSignature,sourceUrl:raw.sourceUrl}});
export const legendsById=indexById(legends);
export const displayPersonName=(person:Person|null|undefined)=>/^(ukjent|unknown)$/iu.test(person?.fullName?.trim()||'')?'':person?.fullName?.trim()||'';
export const legendYear=(legend:Legend)=>legend.year;
export const sourceLabel=(source:Source)=>source.title||source.originalLabel||source.code||'—';
export function resolveLegend(legend:Legend){return{legend,collector:legend.collectorId?collectorsById.get(legend.collectorId)||null:null,narrator:legend.narratorId?narratorsById.get(legend.narratorId)||null:null,place:legend.placeId?placesById.get(legend.placeId)||null:null,county:legend.countyId?countiesById.get(legend.countyId)||null:null,category:legend.mlCategoryId?categoriesById.get(legend.mlCategoryId)||null:null,primarySources:[] as Array<{source:Source;relation:{rawCitation:string|null}}>,secondarySources:[] as Array<{source:Source;relation:{rawCitation:string|null}}>}}
const excerpt=(value:string|null,length=420)=>{const clean=(value||'').replace(/\s+/g,' ').trim();return clean.length>length?`${clean.slice(0,length).trimEnd()}…`:clean};
export const browseRecords=legends.map(legend=>{const data=resolveLegend(legend);return{id:legend.id,sourceTextId:legend.sourceTextId,mlCategoryId:legend.mlCategoryId||'',genreId:legend.genre?`genre:${legend.genre}`:'',subgenreId:legend.subgenre?`subgenre:${legend.subgenre}`:'',countyId:legend.countyId||'',placeId:legend.placeId||'',collectorId:legend.collectorId||'',narratorId:legend.narratorId||'',translationId:legend.text.en?'translated':'norwegian-only',volume:legend.subgenre||'',genre:legend.genre||'',chapterNo:legend.chapter.no||'',chapterEn:legend.chapter.en||'',county:data.county?.name||'',titleNo:legend.title.no||data.category?.title||legend.id,titleEn:legend.title.en||'',place:data.place?.name||'',collector:displayPersonName(data.collector),narrator:displayPersonName(data.narrator),year:legend.year,excerptNo:excerpt(legend.text.no),excerptEn:excerpt(legend.text.en)}});
export const volumes=[...new Set(legends.map(item=>item.subgenre).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b,'no'));
export const chapters=[...new Set(legends.map(item=>item.chapter.no).filter((value):value is string=>Boolean(value)))].sort((a,b)=>a.localeCompare(b,'no'));
