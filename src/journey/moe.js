export const moeIds=['SIN503','SIN263','SIN473','SIN219','SIN532'];
export const moeRoute=records=>moeIds.map(id=>records.find(r=>r.source_text_id===id)).filter(Boolean).map(r=>({...r,journeyColour:'#D2B957'}));
const pair=(en,no)=>({en,no});
export const moeIntro=pair('A collector, many voices. Follow Moltke Moe from his childhood to the people, places and manuscripts behind five legends.','Én samler, mange stemmer. Følg Moltke Moe fra barndommen til menneskene, stedene og manuskriptene bak fem sagn.');
export const moeSources=[
 ['Liv Bratterud with Moltke Moe, summer 1878 · Unknown photographer / Nasjonalbiblioteket · blds_01062 · CC BY 2.0 · image unchanged','https://commons.wikimedia.org/wiki/File:Liv_Brattefud_af_B%C3%B8_herad_fort%C3%A6ller_%C3%A6ventyr_for_Moltke_Moe,_sommeren_1878.jpg'],
 ['Liv photograph licence · Creative Commons Attribution 2.0','https://creativecommons.org/licenses/by/2.0/'],
 ['Childhood portrait · C. T. Thorkildsen / Nasjonalbiblioteket · blds_06261 · no known copyright restrictions','https://commons.wikimedia.org/wiki/File:Portrett_av_Vedastine,_Marie_og_Moltke_Moe.jpg'],
 ['Moltke Moe – Store norske leksikon','https://snl.no/Moltke_Moe'],
 ['Moltke Moe – Lokalhistoriewiki','https://lokalhistoriewiki.no/wiki/Moltke_Moe'],
 ['Therese Foldvik, SAMLA (31.01.2023): Moltke Moe i tidsklemma','https://samla.w.uib.no/2023/01/31/jeg-er-raed-for-at-vi-spraenger-manden-moltke-moe-og-tidsklemma/'],
 ['Portrait, 1911 · Maal og Minne (1914) · Commons lists Knut Liestøl · Public domain in Norway','https://commons.wikimedia.org/wiki/File:Moltke_Moe.png'],
 ['Unknown photographer / Norsk Folkemuseum · NF.07226-001 · presumed 1880–1889 · Public Domain Mark','https://digitaltmuseum.org/011013389822/fra-en-serie-fotografier-fra-et-album-som-har-tilhort-folklorist-og-professor'],
 ['Moeminnet · Ringerikes Museum · further family context','https://digitaltmuseum.org/0211816596540/moeminnet'],
 ['Liv Bratterud · Samla person search (context, not an exact manuscript match)','https://samla.no/viewer/term/-/MD_Informant%3A%22Bratterud%2CU005C+Liv%22/1/-/-/'],
 ['Ingeborg Olavsdatter Næset · Samla person search (context)','https://samla.no/viewer/term/-/MD2_ALLPERSONS%3A%22N%C3%A6set%2CU005C+IngeborgU005C+Olavsdatter%22/1/-/-/'],
 ['Tollev Anundsson Krossvegen · Samla person search','https://samla.no/viewer/term/-/MD_Informant%3A%22Krossvegen%2CU005C+TollevU005C+Anundsson%22/1/-/-/'],
 ['SIN473 · NFS Moltke Moe 7, pp. 1–2 · Samla scan 5 (text continues on following image)','https://samla.no/viewer/image/2fdf12a5-ee74-4cd4-ae6c-443cfbb7e605/5/#topDocAnchor'],
 ['SIN219 · NFS Moltke Moe 7, pp. 4–5 · Samla scan 7','https://samla.no/viewer/image/2fdf12a5-ee74-4cd4-ae6c-443cfbb7e605/7/#topDocAnchor'],
 ['SIN219 · continued · Samla scan 8','https://samla.no/viewer/image/2fdf12a5-ee74-4cd4-ae6c-443cfbb7e605/8/#topDocAnchor']
];
const bio=(key,title,en,no,lat,lon,image,credit)=>({kind:'moe',i:0,j:key,title,text:pair(en,no),target:lat?{lat,lon,sted:title,precision:'region',journeyColour:'#D2B957'}:null,image,credit});
export function moeScenes(route,records,readPages,{portrait,informants,childhood,liv}={}){
 const count=records.filter(r=>r.collectorId==='collector-moltke-moe').length;
 const result=[
 bio('all','Norge','Every thread begins with people. This map brings together the dataset’s collectors, narrators and recorded places. The lines show relationships in the archive, not travel routes.','Hver tråd begynner med mennesker. Kartet samler datasettets samlere, fortellere og registrerte steder. Linjene viser forbindelser i arkivet, ikke reiseruter.'),
 bio('network','Moltke Moe',`Now Moe’s connections remain. ${count} records in this dataset carry his name as collector. They are one part of a much larger body of notebooks, letters and relationships.`,`Nå står Moes forbindelser igjen. ${count} opptegnelser i dette datasettet har ham som samler. De er én del av en langt større samling av skrivebøker, brev og forbindelser.`,null,null,portrait,'Moltke Moe, 1911 · Maal og Minne / Wikimedia Commons'),
 bio('birth','Krødsherad · 1859','Born in Krødsherad in 1859, Moltke was the son of the collector and poet Jørgen Moe. Stories were part of the family world into which he grew up.','Moltke ble født i Krødsherad i 1859 og var sønn av samleren og dikteren Jørgen Moe. Fortellingene var en del av familiemiljøet han vokste opp i.',60.18,9.62),
 bio('childhood','Drammen','His childhood also took him to Drammen and later Vestre Aker. Before following the voices in his notebooks, we pause in the landscape of his own early life.','Barndommen førte ham også til Drammen og senere Vestre Aker. Før vi følger stemmene i skrivebøkene hans, stanser vi i landskapet fra hans eget tidlige liv.',59.744,10.204,childhood,'Vedastine, Marie & Moltke Moe · C. T. Thorkildsen / Nasjonalbiblioteket · blds_06261 · Date unknown'),
 bio('fieldwork','Mo · Telemark','The museum places this photograph in Mo, today in Tokke, probably in the 1880s. Moe stands with two women whose names are not supplied. Collecting depended on encounters like these.','Museet plasserer dette fotografiet i Mo, i dagens Tokke, trolig i 1880-årene. Moe står sammen med to kvinner som ikke er navngitt. Innsamlingen var avhengig av møter som disse.',59.48,7.98,informants,'Unknown photographer / Norsk Folkemuseum · NF.07226-001 · Public domain')
 ];
 const intros=[
 pair('Heddal, 1878. Ingjiber Næset tells of a bargain with a hulder: a bull disappears, and an extraordinary cow arrives. Samla catalogues a narrator as Ingeborg Olavsdatter Næset; the dataset preserves the name Ingjiber.','Heddal, 1878. Ingjiber Næset forteller om en handel med huldra: En stut forsvinner, og ei usedvanlig ku kommer. Samla registrerer en forteller som Ingeborg Olavsdatter Næset; datasettet bevarer navnet Ingjiber.'),
 pair('In Bø we meet Liv Bratterud’s voice. Her legend takes place at Heddal parsonage. The map marks Bø, the catalogue place; the story itself reaches back towards Heddal.','I Bø møter vi stemmen til Liv Bratterud. Sagnet hennes foregår ved Heddal prestegård. Kartet viser Bø, katalogens sted; selve fortellingen fører oss tilbake mot Heddal.'),
 pair('We stay in Bø with Tølløv Krossvegjen. A field is harvested overnight, after its owner promises a bull. Here we can follow the words into Moe’s handwritten notebook in Samla.','Vi blir i Bø hos Tølløv Krossvegjen. En åker blir skåret om natten etter at eieren lover bort en stut. Her kan vi følge ordene inn i Moes håndskrevne notatbok i Samla.'),
 pair('The same narrator offers another kind of journey. A mouse leaves a sleeping man’s mouth and crosses a sword laid over a stream. The dream and the landscape briefly become one.','Den samme fortelleren gir oss en annen slags reise. Ei mus kommer ut av munnen på en sovende mann og krysser en sabel over en bekk. Drømmen og landskapet blir et øyeblikk ett.'),
 pair('Another Bø voice, Tomås Aarmoti, tells of a household spirit and a bowl of Christmas porridge. A small misunderstanding has consequences in the cowshed.','En annen stemme fra Bø, Tomås Aarmoti, forteller om en haugebonde og en skål julegrøt. En liten misforståelse får følger i fjøset.')
 ];
 route.forEach((r,i)=>{
 result.push({kind:'moe',i,j:'legend-'+i,title:r.sted,text:intros[i],target:r,image:i===1?liv:null,credit:i===1?'Liv Bratterud & Moltke Moe · Summer 1878 · Unknown photographer / Nasjonalbiblioteket · blds_01062 · CC BY 2.0':null,manuscript:i===2?moeSources.find(([name])=>name.startsWith('SIN473'))[1]:i===3?moeSources.find(([name])=>name.startsWith('SIN219'))[1]:null});
 const pages=readPages(r);pages.forEach((page,p)=>result.push({kind:'read',i,p,total:pages.length,...page}));
 });
 result.push({...bio('work','Kristiania · Oslo','Moe became a professor in 1886. In Kristiania, teaching, correspondence and helping others competed with his own research. Samla’s account reveals a generous colleague whose network also made demands on his time.','Moe ble professor i 1886. I Kristiania konkurrerte undervisning, brevveksling og hjelp til andre med hans egen forskning. Samlas artikkel viser en gavmild kollega som også ble sterkt etterspurt i nettverket sitt.',59.92,10.73,portrait,'Moltke Moe, 1911 · Maal og Minne / Wikimedia Commons'),i:route.length-1});
 result.push({...bio('return','Moltke Moe · 1859–1913','The collector’s name connects the records. The narrators give them their voices. Moe died in 1913; his papers helped form the foundation of Norsk Folkeminnesamling. Today Samla opens another way into this work.','Samlerens navn knytter opptegnelsene sammen. Fortellerne gir dem stemmene sine. Moe døde i 1913; papirene hans ble en del av grunnlaget for Norsk Folkeminnesamling. I dag åpner Samla en ny vei inn i dette arbeidet.'),i:route.length-1});
 result.push({kind:'end',i:route.length-1});return result;
}
