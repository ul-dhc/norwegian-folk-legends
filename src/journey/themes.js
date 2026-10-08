import {mapped,normalText} from './engine.js';
import {shortEnough,journeyEligible} from './appearance.js';
const stop=(id,en,no)=>({id,en,no});
export const THEMES={
 water:{code:'ml4050',colour:'#58C4B0',en:'A voice calls from the water',no:'Rop fra vannet',
 description:{en:'Fifteen places. A recurring call, heard beside water and ice.',no:'Femten steder. Et tilbakevendende rop ved vann og is.'},
 intro:{en:'Across these records, a voice is heard from the water. We follow fifteen legends, staying with the same theme as places and voices change.',no:'I disse opptegnelsene høres en stemme fra vannet. Vi følger femten fortellinger om samme tema, mens steder og stemmer skifter.'},
 ending:{en:'The call has followed us from place to place. The legends share a phrase, but each gives it a different setting and voice.',no:'Ropet har fulgt oss fra sted til sted. Fortellingene deler et uttrykk, men hver gir det sine omgivelser og sin stemme.'},
 stops:[
 stop("SIN262","We begin in Søgne. Johan Jonson Høllen’s legend brings a rider and a priest to a river that calls.","Vi begynner i Søgne. I Johan Jonson Høllens fortelling møter vi en rytter og en prest ved en elv som roper."),
 stop("SIN779","At Eiken, the danger lies in rotten ice. The priest tries to keep a man from answering the call.","Ved Eiken ligger faren i råtten is. Presten prøver å hindre en mann i å svare på ropet."),
 stop('SIN781','In the record from Nissedal, the setting changes. In this legend, the cry comes from the ice.','I opptegnelsen fra Nissedal skifter omgivelsene. I denne fortellingen kommer ropet fra isen.'),
 stop('SIN263','In Bø, Liv Bratterud tells of an encounter at Heddal parsonage. A record can belong to one place and speak of another.','I Bø forteller Liv Bratterud om et møte ved prestegården i Heddal. En opptegnelse kan høre til ett sted og fortelle om et annet.'),
 stop("SIN251","The record from Eidskog names Glåma. A man is kept from the river, but asks for its water.","Opptegnelsen fra Eidskog nevner Glåma. En mann blir holdt borte fra elven, men ber om vann fra den."),
 stop("SIN776","In Elverum, Ola Enberget remembers a ferry crossing. The legend leaves open which of two crossings it was.","I Elverum forteller Ola Enberget om en ferjeoverfart. Fortellingen lar det stå åpent hvilket av to sund det var."),
 stop("SIN1343","At Vestre Slidre, Berit Andersdotter Ur’n recalls a story about her grandmother’s time in service. Someone answers the voice from the ice.","Ved Vestre Slidre forteller Berit Andersdotter Ur’n fra den tiden bestemoren hennes var i tjeneste. Noen svarer stemmen fra isen."),
 stop("SIN254","In Øystre Slidre, Ragna I. Haugen tells of a man who avoids water for the rest of his life. Here the call casts a long shadow.","I Øystre Slidre forteller Ragna I. Haugen om en mann som unngår vann resten av livet. Her kaster ropet en lang skygge."),
 stop('SIN250','Now Vang, and the voice of Gjartrud Olsdotter Eltun. A boy and a traveller hear the call beside a lake.','Nå kommer vi til Vang og stemmen til Gjartrud Olsdotter Eltun. En gutt og en reisende hører ropet ved et vann.'),
 stop('SIN247','The thread reaches Odda. Here the legend names Låtefossen, mills and a man resting with his load.','Tråden når Odda. Her nevner fortellingen Låtefossen, kvernhus og en mann som hviler med børen sin.'),
 stop("SIN780","The thread reaches Fjaler. A ferryman rests beside his boat; a rider arrives in haste.","Tråden når Fjaler. En ferjemann hviler ved båten sin; en rytter kommer i all hast."),
 stop('SIN255','In the record from Innvik, the water is the sea. The legend is brief; the familiar call remains.','I opptegnelsen fra Innvik er vannet sjøen. Fortellingen er kort; det kjente ropet blir igjen.'),
 stop("SIN778","In Vågå, the story names Otta and a bridge swept away by floodwater. A journey to church becomes a river crossing.","I Vågå nevner fortellingen Otta og en bro som flommen har tatt. En kirkeferd blir til en elvekryssing."),
 stop("SIN261","This record is placed at Hattfjelldal, but Mathea Einbu’s legend takes us to the river by Vefsn parsonage. The archive links two places.","Denne opptegnelsen er plassert ved Hattfjelldal, men Mathea Einbus fortelling tar oss til elven ved prestegården i Vefsn. Arkivet knytter sammen to steder."),
 stop('SIN1383','We finish in Vefsn with a record collected by Ivar Aasen. A river crossing brings the call into the evening darkness.','Vi avslutter i Vefsn med en opptegnelse samlet av Ivar Aasen. Ved et vadested høres ropet i kveldsmørket.')
 ]},
 hulder:{code:'ml6020',colour:'#DF907B',en:'The grateful hulder woman',no:'Takknemlig huldrekone',
 description:{en:'Twelve encounters. Small acts of care, and what is left in return.',no:'Tolv møter. Små handlinger av omsorg, og det som blir lagt igjen.'},
 intro:{en:'A child’s wrapping, a hearth, a stranger in the cowshed. These records gather encounters in which an ordinary gesture reaches an unseen neighbour.',no:'En barnelind, et ildsted, en fremmed i fjøset. Disse opptegnelsene samler møter der en hverdagslig handling når en usynlig nabo.'},
 ending:{en:'A wrapping returned, a gift left behind. Across these places, the stories give different forms to care and gratitude.',no:'En barnelind kommer tilbake, en gave blir igjen. På disse stedene gir fortellingene omsorg og takknemlighet ulike former.'},
 stops:[
 stop('SIN1357','Our first stop is Mykland. Torjus Sivertsen’s legend begins with a woman wrapping her child on a farm.','Første stopp er Mykland. Torjus Sivertsens fortelling begynner med en kvinne som reiver barnet sitt på en gård.'),
 stop('SIN1293','In Kviteseid, a forgotten wrapping appears beside the hearth. Listen for the invitation that follows.','I Kviteseid ligger en glemt barnelind ved ildstedet. Lytt etter invitasjonen som følger.'),
 stop('SIN913','The thread reaches Rennesøy. Here a servant notices a mother and child by the fire.','Tråden når Rennesøy. Her får en tjenestejente øye på en mor og et barn ved ilden.'),
 stop("SIN914","At Ullensvang, a belt lies in the cowshed. A shovel handle becomes a way to return it.","Ved Ullensvang ligger et belte i fjøset. Et spadeskaft blir en måte å levere det tilbake på."),
 stop('SIN445','In the record from Kinsarvik, the encounter takes place among cattle. A frightened visitor leaves something behind.','I opptegnelsen fra Kinsarvik skjer møtet blant kyrne. En skremt gjest glemmer noe igjen.'),
 stop("SIN917","In Øre, Sivert O. Torvik tells of a young woman and a child by the hearth. A skein of blue yarn enters the exchange.","I Øre forteller Sivert O. Torvik om en ung kvinne og et barn ved ildstedet. Et hespe blått garn blir en del av utvekslingen."),
 stop('SIN1364','We move to Straumsnes and a legend by Lisabet E. Kamsvaag. The wrapping is noticed by everyone in the house.','Vi går videre til Straumsnes og en fortelling av Lisabet E. Kamsvaag. Alle i huset får se barnelinden.'),
 stop("SIN451","The Surnadal legend pauses over where a wrapping should be left. Making room for another household becomes an act of care.","Fortellingen fra Surnadal dveler ved hvor en barnelind skal ligge. Å gi plass til en annen husstand blir en omsorgshandling."),
 stop("SIN1365","In Soknedal, a forgotten wrapping is returned with a stick. The encounter leaves a small, lasting object behind.","I Soknedal blir en glemt barnelind levert tilbake med en pinne. Etter møtet blir en liten, varig gjenstand igjen."),
 stop("SIN916","At Verdal, Martin Blybakken tells of shavings swept away from the fire. The gift that follows has a story of its own.","Ved Verdal forteller Martin Blybakken om spon som blir feid bort fra ilden. Gaven som følger, har sin egen historie."),
 stop("SIN1363","In Saltdal, Julius Nygard’s legend remembers Eline and the sound of spinning at night. Thanks arrive in a dream.","I Saltdal forteller Julius Nygard om Eline og lyden av spinning om natten. Takken kommer i en drøm."),
 stop('SIN915','Our final legend comes from Fauske. What first looks like a discarded rag turns out to matter to someone.','Den siste fortellingen kommer fra Fauske. Det som først ser ut som en bortslengt fille, viser seg å bety noe for noen.')
 ]},
 boundary:{code:'ml4035',colour:'#A18BD0',en:'The boundary ghost',no:'Deildegasten',
 description:{en:'Nine places, from the south to Balestrand. Land, disputed boundaries and restless dead.',no:'Ni steder, fra sør til Balestrand. Jord, omstridte grenser og hvileløse døde.'},
 intro:{en:'A boundary stone marks more than land. These legends connect a disputed landscape with wrongdoing that does not rest after death.',no:'En bytestein markerer mer enn jord. Disse fortellingene knytter et omstridt landskap til urett som ikke får hvile etter døden.'},
 ending:{en:'Stones, oaths and judgements have marked this thread. The landscape holds the consequences of how people treated one another.',no:'Steiner, eder og dommer har preget denne tråden. Landskapet bærer følgene av hvordan mennesker behandlet hverandre.'},
 stops:[
 stop('SIN1186','We begin in Egersund. In rain and mist, someone is heard carrying boundary stones uphill.','Vi begynner i Egersund. I regn og skodde høres noen som bærer merkesteiner oppover bakken.'),
 stop('SIN1188','At Spangereid, the story turns from a moved stone to a judgement over a disputed marsh.','Ved Spangereid går fortellingen fra en flyttet stein til en dom om ei omstridt myr.'),
 stop('SIN1146','In Fjotland, herders hear cries beside the water. This legend asks what might put a disturbed boundary right.','I Fjotland hører gjetere skrik ved vannet. Denne fortellingen spør hva som kan rette opp et forstyrret bytte.'),
 stop('SIN1184','Now Åseral. The effort of lifting a stone returns, heard especially in misty weather.','Nå kommer vi til Åseral. Slitet med å løfte en stein vender tilbake, særlig hørt i skoddever.'),
 stop('SIN1185','The record from Søndeled lingers over wooded hills and small lakes. The landscape answers the ghost with echoes.','Opptegnelsen fra Søndeled dveler ved skogkledde heier og små tjern. Landskapet svarer gasten med ekko.'),
 stop('SIN1187','In Nissedal, Laurants Tveitsund tells of an oath. Listen to how the man claims the ground beneath his feet.','I Nissedal forteller Laurants Tveitsund om en ed. Lytt til hvordan mannen gjør krav på jorden under føttene sine.'),
 stop('SIN1285','In Kviteseid, we hear Gunnar Godlid’s brief legend. A witness watches the same effort, again and again.','I Kviteseid hører vi Gunnar Godlids korte fortelling. Et vitne ser det samme slitet, gang på gang.'),
 stop("SIN1144","In Bø, the stone has a name: Karrpusa. Its unusual shape gives this legend a particular object to remember.","I Bø har steinen et navn: Karrpusa. Den uvanlige formen gir denne fortellingen en bestemt gjenstand å huske."),
 stop("SIN1189","Our final stop is Balestrand. Sjur Bøyum’s record gathers several local accounts; the boundary ghost belongs to more than one hillside.","Siste stopp er Balestrand. Sjur Bøyums opptegnelse samler flere lokale fortellinger; deildegasten hører til i mer enn én li.")
 ]}
};
export function themeRoute(records,key){
 const theme=THEMES[key];if(!theme)return [];
 const lookup=new Map(records.map(r=>[r.source_text_id,r]));
 const route=theme.stops.map(stop=>lookup.get(stop.id));
 if(route.some(r=>!r||r.ml_code!==theme.code||!mapped(r)||!shortEnough(r)||!journeyEligible(r)))return [];
 if(new Set(route.map(r=>normalText(r.tekst))).size!==route.length)return [];
 if(new Set(route.map(r=>`${r.lat},${r.lon}`)).size!==route.length)return [];
 return route.map(r=>({...r,journeyColour:theme.colour}));
}
