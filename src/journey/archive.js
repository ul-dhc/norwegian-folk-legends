import page1 from '../assets/moe/samla-scan-4.jpg?url';
import page2 from '../assets/moe/samla-scan-5.jpg?url';
import page3 from '../assets/moe/samla-scan-6.jpg?url';
import page4 from '../assets/moe/samla-scan-7.jpg?url';
import page5 from '../assets/moe/samla-scan-8.jpg?url';
const pair=(en,no)=>({en,no});
export const archivePages=[
 {image:page1,scan:4,page:1,title:pair('The story begins','Fortellingen begynner'),text:pair('At the foot of the page: “Dæ va ein mann her bol på Erikstein.” The legend you heard shares its page with everyday sayings. A manuscript preserves that company, too.','Nederst på siden: «Dæ va ein mann her bol på Erikstein.» Sagnet du hørte, deler side med hverdagens uttrykk. Manuskriptet bevarer også denne sammenhengen.'),position:76},
 {image:page2,scan:5,page:2,title:pair('A narrator leaves his name','En forteller etterlater navnet sitt'),text:pair('The story ends near the top. Beneath it, Moltke writes Tølløv Krossvegjen’s name. This small attribution connects a voice, a written record and the legend in our dataset.','Fortellingen slutter øverst. Under den skriver Moltke navnet Tølløv Krossvegjen. Den lille kildehenvisningen knytter sammen en stemme, en opptegnelse og sagnet i datasettet.'),position:22},
 {image:page3,scan:6,page:3,title:pair('The surrounding world','Verden omkring sagnet'),text:pair('Between the two legends are other notes: customs, beliefs and another narrator’s name. Reading neighbouring pages reveals the wider world Moltke was recording.','Mellom de to sagnene finnes andre notater: skikker, trosforestillinger og en annen fortellers navn. Nabosidene viser mer av verdenen Moltke skrev ned.'),position:70},
 {image:page4,scan:7,page:4,title:pair('Another story opens','En ny fortelling begynner'),text:pair('Below the dividing line, Tølløv’s name appears again. A second legend begins here and continues on the following page. In our dataset it is SIN219.','Under skillelinjen dukker Tølløvs navn opp igjen. Et annet sagn begynner her og fortsetter på neste side. I datasettet vårt er det SIN219.'),position:72},
 {image:page5,scan:8,page:5,title:pair('Follow the continuation','Følg fortsettelsen'),text:pair('The second legend continues at the top, before the notebook moves on to other material. SAMLA lets you keep turning these pages, beyond the selection in this journey.','Det andre sagnet fortsetter øverst, før notatboken går videre til annet materiale. I SAMLA kan du bla videre, utover utvalget i denne reisen.'),position:18}
];
export const archiveUrl=scan=>`https://samla.no/viewer/image/2fdf12a5-ee74-4cd4-ae6c-443cfbb7e605/${scan}/#topDocAnchor`;
const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function archiveMarkup(lang,sources,records=[]){
 const en=lang==='en';
 const legends=records.filter(r=>r.collectorId==='collector-moltke-moe').sort((a,b)=>(a.tittel||a.ml_title||a.source_text_id).localeCompare(b.tittel||b.ml_title||b.source_text_id,'no'));
 return `<div class="archive-legacy">
 <div class="legacy-landscape">
  <div class="legacy-manuscripts" aria-hidden="true">${archivePages.map((p,i)=>`<img src="${p.image}" alt="" style="--sheet-index:${i}"/>`).join('')}</div>
  <div class="legacy-titles-window" tabindex="0" aria-label="${en?'Legends collected by Moltke Moe':'Sagn samlet av Moltke Moe'}">
   <ol class="legacy-titles">${legends.map(r=>`<li><a href="${escape(r.url)}" target="_blank" rel="noopener"><span>${escape(r.tittel||r.ml_title||r.source_text_id)}</span><small>${escape(r.sted)} · ${escape(r.source_text_id)}</small></a></li>`).join('')}</ol>
  </div>
  <p class="legacy-page-credit">${en?'Manuscript pages':'Manuskriptsider'}: NFS Moltke Moe 7 · SAMLA</p>
 </div>
 <section class="legacy-invitation">
  <h2>${en?'A life time of folklore collecting and listening':'Et liv med folkeminnesamling og lytting'}</h2>
  <p>${en?'People told their stories. Moltke listened and wrote them down. A voice became handwriting; a local memory became something that could outlive its teller.':'Mennesker fortalte. Moltke lyttet og skrev ned. En stemme ble til håndskrift; et lokalt minne ble til noe som kunne leve videre etter fortelleren.'}</p>
  <p>${en?'These 88 records are only a small part of the work preserved in the Norwegian Folklore Archives in Oslo. Today the Norwegian digital folklore archive SAMLA opens these collections to new readers.':'Disse 88 opptegnelsene er bare en liten del av arbeidet som er bevart i Norsk Folkeminnesamling i Oslo. I dag åpner det norske digitale folkeminnearkivet SAMLA samlingene for nye lesere.'}</p>
  <div class="legacy-links"><a href="${import.meta.env.BASE_URL}browse/?collector=collector-moltke-moe" target="_blank" rel="noopener">${en?"Read all of Moltke’s legends in this database":"Les alle Moltkes sagn i denne databasen"}</a><a class="legacy-samla" href="https://samla.no/viewer/" target="_blank" rel="noopener">${en?'Explore SAMLA':'Utforsk SAMLA'}</a><a href="${archiveUrl(4)}" target="_blank" rel="noopener">${en?'Open Moltke’s notebook':'Åpne Moltkes notatbok'}</a></div>
 </section></div>`;
}
export async function selectArchivePage(container,index,lang){
 const p=archivePages[index];if(!p)return;
 const en=lang==='en',context=container.querySelector('.archive-context');
 const previous=container.dataset.selectedPage;container.dataset.selectedPage=String(index);
 const sequence=Number(container.dataset.selectionSequence||0)+1;container.dataset.selectionSequence=String(sequence);
 const motion=!container.closest('.still-art')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
 container.querySelectorAll('[data-archive-page]').forEach(button=>button.setAttribute('aria-pressed',String(Number(button.dataset.archivePage)===index)));
 if(context.textContent&&previous!==String(index)&&motion){await context.animate([{opacity:1},{opacity:0}],{duration:350,fill:'forwards'}).finished.catch(()=>{});}
 if(Number(container.dataset.selectionSequence)!==sequence)return;
 context.getAnimations().forEach(animation=>animation.cancel());
 context.innerHTML=`<div><small>${en?'LOOK CLOSER':'SE NÆRMERE'} · ${en?'PAGE':'SIDE'} ${p.page}</small><h3>${escape(p.title[lang])}</h3><p>${escape(p.text[lang])}</p></div><div class="archive-context-actions"><button type="button" data-archive-enlarge>${en?'Read this page':'Les denne siden'}</button><a href="${archiveUrl(p.scan)}" target="_blank" rel="noopener">${en?'Continue in SAMLA':'Fortsett i SAMLA'}</a></div>`;
 if(motion)context.animate([{opacity:0},{opacity:1}],{duration:1100,easing:'ease-out'});
}
