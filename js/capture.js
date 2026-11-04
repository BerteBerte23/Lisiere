// Réception d’une capture envoyée par l’extension Chrome « Lisière Capture ».
// Principe : rien n’est enregistré ici. La capture ouvre le formulaire EXISTANT,
// pré-rempli, et l’enregistrement reste un clic de la personne connectée.
// Aucun champ nouveau, aucune règle Firestore modifiée.
import {normalizeBook,duplicate,norm,validISBN,STATUSES} from './model.js';
import {normalizeMedia,duplicateMedia,safeSource,MEDIA_STATUSES} from './media-model.js';

const KINDS=['book','movie','series'];
const SITES=['wikipedia','allocine','senscritique','babelio','manuel'];
const ID=/^[A-Za-z0-9-]{8,64}$/;
const SETTLE=1200; // laisse arriver les fiches Firestore avant les vérifications de doublon
const text=(v,n)=>String(v??'').trim().slice(0,n);
const list=(v,n,max)=>[...new Set((Array.isArray(v)?v:[]).map(x=>text(x,n)).filter(Boolean))].slice(0,max);

// Toute capture est une donnée non fiable : validée, bornée, puis normalisée par les modèles existants.
function clean(d){
  if(!ID.test(d?.id||''))throw Error('Identifiant de capture invalide.');
  const r=d.item;
  if(!r||typeof r!=='object'||Array.isArray(r)||!KINDS.includes(r.kind))throw Error('Type de capture invalide.');
  const title=text(r.title,250);if(!title)throw Error('Le titre est obligatoire.');
  const year=/^\d{4}$/.test(text(r.year,4))?text(r.year,4):'';
  const isbn=validISBN(r.isbn)?String(r.isbn).replace(/[-\s]/g,'').toUpperCase():'';
  const allowed=r.kind==='book'?STATUSES:MEDIA_STATUSES;
  return{
    id:d.id,kind:r.kind,title,year,isbn:r.kind==='book'?isbn:'',
    creators:list(r.creators,120,10),genres:r.kind==='book'?[]:list(r.genres,60,12),
    description:text(r.description,12000),
    status:Object.hasOwn(allowed,r.status)?r.status:(r.kind==='book'?'unread':'unwatched'),
    owned:r.owned===true,wish:r.wish===true,
    sourceSite:SITES.includes(r.sourceSite)?r.sourceSite:'manuel',
    sourceUrl:text(r.sourceUrl,2000),catalogId:text(r.catalogId,100)
  };
}

export function createCapture(h){
  const seen=new Map(),queue=[],noted=new Set(),modal=document.querySelector('#modal');
  let timer=0,running=false;
  const ack=(id,status,message='')=>{seen.set(id,status);window.postMessage({type:'lisiere-capture-ack',v:1,id,status,message},location.origin)};
  const note=(it,status,message)=>{ack(it.id,status,message);const k=it.id+status;if(!noted.has(k)){noted.add(k);h.toast(message)}};
  const schedule=()=>{clearTimeout(timer);if(queue.length&&!running)timer=setTimeout(run,SETTLE)};

  async function run(){
    const it=queue[0];if(!it||running)return;
    const s=h.state();
    if(s.mode==='none'||s.loading){note(it,'waiting','Capture en attente : connectez-vous à Lisière pour terminer l’ajout.');return}
    if(modal.open){note(it,'waiting','Capture en attente : fermez la fenêtre ouverte pour continuer.');return}
    running=true;queue.shift();
    try{it.kind==='book'?book(it,s):media(it,s)}
    catch(e){ack(it.id,'invalid',e instanceof Error?e.message:'Capture invalide.');h.toast('Capture impossible : '+(e instanceof Error?e.message:'données invalides')+'. Aucune fiche créée.')}
    finally{running=false;schedule()}
  }

  function book(it,s){
    const b=normalizeBook({title:it.title,authors:it.creators,published:it.year,isbn:it.isbn,description:it.description,status:it.status,owned:it.owned,wish:it.wish,source:'Manuel'});
    const dup=duplicate(s.books,b);
    if(dup){ack(it.id,'exists','Ce livre existe déjà.');if(h.confirm(`« ${dup.title} » est déjà dans votre bibliothèque. Ouvrir sa fiche ? Aucune nouvelle fiche ne sera créée.`))h.showBook(dup.id);return}
    const near=s.books.find(x=>norm(x.title)===norm(b.title));
    if(near&&!h.confirm(`Une fiche proche existe déjà : « ${near.title} »${near.authors.length?' ('+near.authors.join(', ')+')':''}. Préparer quand même une nouvelle fiche ? Rien ne sera enregistré sans votre confirmation.`)){ack(it.id,'cancelled','Ajout abandonné.');return}
    h.openBook(b);ack(it.id,'opened');h.toast('Vérifiez la fiche, puis enregistrez-la.');
  }

  function media(it,s){
    if(s.mode!=='cloud'||!h.canMedia()){
      const msg='Films et séries sont réservés au compte de Quentin. Aucune fiche créée ni copiée.';
      ack(it.id,'refused',msg);h.toast(msg);return;
    }
    const wiki=it.sourceSite==='wikipedia'&&Boolean(safeSource(it.sourceUrl,'Wikipédia'));
    const m=normalizeMedia({kind:it.kind,title:it.title,creators:it.creators,genres:it.genres,year:it.year,description:it.description,status:it.status,source:wiki?'Wikipédia':'Manuel',sourceUrl:wiki?it.sourceUrl:'',catalogId:wiki?it.catalogId:''});
    const dup=duplicateMedia(s.media||[],m);
    if(dup){const msg='Cette œuvre existe déjà : '+dup.title+'. Aucune nouvelle fiche créée.';ack(it.id,'exists',msg);h.toast(msg);return}
    const near=(s.media||[]).find(x=>x.kind===m.kind&&norm(x.title)===norm(m.title));
    if(near&&!h.confirm(`Une fiche proche existe déjà : « ${near.title} »${near.year?' ('+near.year+')':''}. Préparer quand même une nouvelle fiche ? Rien ne sera enregistré sans votre confirmation.`)){ack(it.id,'cancelled','Ajout abandonné.');return}
    h.openMedia(m);ack(it.id,'opened');h.toast('Vérifiez la fiche, puis enregistrez-la.');
  }

  window.addEventListener('message',e=>{
    if(e.source!==window||e.origin!==location.origin)return;
    const d=e.data;if(!d||typeof d!=='object'||d.type!=='lisiere-capture'||d.v!==1)return;
    const id=typeof d.id==='string'&&ID.test(d.id)?d.id:'';if(!id)return;
    if(seen.has(id)){ack(id,seen.get(id));return}           // rejeu : jamais deux fiches pour une même capture
    if(queue.length>=3){ack(id,'invalid','Trop de captures en attente.');return}
    let it;try{it=clean(d)}catch(err){ack(id,'invalid',err.message);return}
    ack(id,'waiting');queue.push(it);schedule();
  });
  modal.addEventListener('close',schedule);
  return{update:schedule};
}
