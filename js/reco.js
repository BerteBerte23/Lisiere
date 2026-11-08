// Onglet « Pour vous » : suggestions de films/séries (TMDB), épisodes des séries suivies (TVmaze/TMDB),
// livres (Open Library), préférences et notifications. Rien n'est ajouté à la bibliothèque sans validation de la fiche.
import {esc,norm,safeImage,GENRES} from './model.js';
import {safePoster,normalizeMedia} from './media-model.js';
import * as store from './store.js';
import * as pwa from './pwa.js';
import {CONFIG} from '../config.js';
import {BOOK_LABELS,MOVIE_LABELS,TV_LABELS,defaultPrefs,normalizePrefs,effectiveGenres} from './prefs-model.js';
const N=()=>globalThis.LisiereNews;
const HOURS=3600000,SUBJECTS={'Roman':'fiction','Policier / Thriller':'thriller','Romance':'romance','New Romance':'romance','Fantasy':'fantasy','Science-fiction':'science_fiction','Historique':'historical_fiction','Contemporain':'contemporary_fiction','Littérature générale':'literature','Biographie':'biography','Essai':'essays','BD / Manga':'manga','Jeunesse':'juvenile_fiction'};
let olQueue=Promise.resolve(),olLast=0;
function olJson(url){const run=async()=>{const wait=Math.max(0,1100-(Date.now()-olLast));if(wait)await new Promise(r=>setTimeout(r,wait));olLast=Date.now();const r=await fetch(url,{signal:AbortSignal.timeout(18000),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Open Library indisponible');return r.json()};const p=olQueue.then(run);olQueue=p.catch(()=>{});return p}
const pickSome=(a,n)=>[...a].sort(()=>Math.random()-.5).slice(0,n);

export function createReco(h){
 let st={},curUid='',lastSig='',feed=null,booksRec=null,checkedAt=0,autoDone=false,message='',booksMsg='';
 const busy={feed:false,books:false},more={movie:false,series:false,book:false};
 const mediaOn=()=>st.mode==='cloud'&&st.profile?.media===true;
 const keyOn=()=>Boolean(CONFIG.tmdbApiKey);
 const prefs=()=>({...defaultPrefs(),...(st.prefs||{})});
 const lib=()=>({books:st.books||[],media:st.media||[]});
 const owned=i=>(st.media||[]).some(m=>m.kind===i.kind&&(m.source==='TMDB'&&m.catalogId===i.catalogId||norm(m.title)===norm(i.title)&&m.year===i.year));

 function makeSnap(){
  const p=prefs(),eff=effectiveGenres(p,lib()),media=mediaOn();
  const followed=media?(st.media||[]).filter(m=>m.kind==='series'&&(m.status==='watching'||m.status==='watched')).sort((a,b)=>(b.status==='watching')-(a.status==='watching')).map(m=>m.source==='TVmaze'&&/^\d{1,9}$/.test(m.catalogId)?{src:'tvmaze',id:m.catalogId,title:m.title}:m.source==='TMDB'&&/^tv:\d{1,9}$/.test(m.catalogId)?{src:'tmdb',id:m.catalogId.slice(3),title:m.title}:null).filter(Boolean).slice(0,20):[];
  return{v:1,uid:st.uid,media,tmdbKey:CONFIG.tmdbApiKey||'',region:CONFIG.region||'FR',genresMovie:eff.movie,genresSeries:eff.series,notifyMovies:media&&p.notifyMovies,notifySeries:media&&p.notifySeries,notifyFollowed:media&&p.notifyFollowed,followed,ownedKeys:(st.media||[]).filter(m=>m.source==='TMDB').map(m=>m.catalogId),ownedTitles:(st.media||[]).map(m=>norm(m.title)+'|'+m.year)};
 }
 // Appelé à chaque changement d'état : prépare l'instantané pour la vérification en arrière-plan et lance la vérification à l'ouverture.
 function sync(s){
  st=s;const n=N();
  const cloud=s.mode==='cloud'&&s.uid&&!s.loading,uid=cloud?s.uid:s.mode==='local'?'local':'';
  if(uid!==curUid){
   if(curUid&&curUid!=='local'&&n)n.idbDel('snap');
   curUid=uid;lastSig='';feed=null;booksRec=null;checkedAt=0;autoDone=false;message='';booksMsg='';busy.feed=busy.books=false;
   if(cloud&&n)n.idbGet('feed:'+uid).then(c=>{if(c&&curUid===uid&&!feed){feed=c;checkedAt=c.at||0;h.render()}});
  }
  if(!n||!cloud||!s.prefsReady||!mediaOn())return;
  const snap=makeSnap(),sig=JSON.stringify(snap);
  if(sig!==lastSig){lastSig=sig;n.idbSet('snap',snap)}
  if(!autoDone&&!busy.feed){autoDone=true;if(Date.now()-checkedAt>3*HOURS)checkNews(false)}
 }
 async function checkNews(manual){
  const n=N();if(!n||busy.feed||!mediaOn())return;
  busy.feed=true;message='';h.render();
  try{
   const snap=makeSnap(),k='seen:'+snap.uid,seen=await n.idbGet(k);
   const r=await n.run(snap,Array.isArray(seen)?seen:null);
   if(snap.uid!==curUid)return;
   feed={at:r.at,feed:r.feed,episodes:r.episodes,errors:r.errors,needsKey:r.needsKey};checkedAt=r.at;
   await n.idbSet(k,r.seen);await n.idbSet('feed:'+snap.uid,feed);
   if(r.notify.length){const shown=await pwa.showLocal(r.notify).catch(()=>false);if(!shown)h.toast(r.notify[0].body+(r.notify.length>1?` (+${r.notify.length-1})`:''))}
   message=r.errors.length?'Certaines sources n’ont pas répondu. Réessayez plus tard.':manual?'À jour.':'';
  }catch{message='Vérification impossible pour le moment. Vérifiez la connexion.'}
  finally{busy.feed=false;h.render()}
 }
 async function loadBooks(force){
  const n=N();if(busy.books)return;busy.books=true;booksMsg='';
  try{
   const eff=effectiveGenres(prefs(),lib()),books=st.books||[];
   const loved=[...books.filter(b=>b.rating>=4&&b.authors[0])].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)).map(b=>b.authors[0]);
   const authors=[...new Set(loved)].slice(0,4),genres=eff.book.filter(g=>SUBJECTS[g]);
   const sig=JSON.stringify([genres.slice().sort(),authors.slice().sort()]),ck='books:'+curUid;
   if(!force&&n){const c=await n.idbGet(ck);if(c&&c.sig===sig&&Date.now()-c.at<24*HOURS&&Array.isArray(c.items)){booksRec=c.items;return}}
   if(!genres.length&&!authors.length){booksRec=[];return}
   const have=new Set(books.map(b=>norm(b.title))),seen=new Set(),items=[];
   const take=(docs,reason,genre,max)=>{let k=0;for(const d of docs||[]){if(k>=max)break;const t=String(d.title||'').trim();if(!t||!d.cover_i||!Number.isSafeInteger(d.cover_i)||have.has(norm(t))||seen.has(norm(t)))continue;seen.add(norm(t));k++;items.push({key:String(d.key||t),title:t.slice(0,250),authors:(Array.isArray(d.author_name)?d.author_name:[]).slice(0,3).map(String),year:String(d.first_publish_year||''),cover:`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`,reason,genre,url:/^\/works\/OL\d+W$/.test(d.key||'')?'https://openlibrary.org'+d.key:''})}};
   const fields='key,title,author_name,cover_i,first_publish_year';
   for(const a of authors.slice(0,2)){try{const u=new URL('https://openlibrary.org/search.json');u.search=new URLSearchParams({q:`author:"${a.replace(/"/g,'')}"`,limit:'12',sort:'rating',fields});take((await olJson(u)).docs,`Parce que vous aimez ${a}`,'',4)}catch{}}
   for(const g of pickSome(genres,3)){try{const u=new URL('https://openlibrary.org/search.json');u.search=new URLSearchParams({q:`subject:"${SUBJECTS[g]}" language:fre`,limit:'20',sort:'rating',fields});take((await olJson(u)).docs,`Genre : ${g}`,g,5)}catch{}}
   booksRec=items.slice(0,16);
   if(!booksRec.length)booksMsg='Aucune suggestion trouvée pour le moment.';
   if(n)await n.idbSet(ck,{at:Date.now(),sig,items:booksRec});
  }catch{booksRec=[];booksMsg='Suggestions de livres indisponibles pour le moment.'}
  finally{busy.books=false;h.render()}
 }
 const when=i=>i.date?(i.when==='upcoming'?'Sortie le ':'Sorti le ')+N().frDate(i.date):i.year;
 function posterCard(i,attr,meta,tags){
  const u=i.kind?safePoster(i.poster):safeImage(i.cover);
  return`<button class="book-card" ${attr} aria-label="Voir ${esc(i.title)}"><div class="cover-wrap"><div class="cover-fallback">${esc(i.title)}<small>${esc(i.year||'')}</small></div>${u?`<img data-cover src="${esc(u)}" alt="Couverture de ${esc(i.title)}" referrerpolicy="no-referrer" loading="lazy">`:''}</div><h3>${esc(i.title)}</h3><p>${esc(meta)}</p>${tags.slice(0,2).map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</button>`;
 }
 function section(kind,title,items,empty){
  const shown=more[kind]?items:items.slice(0,12);
  return`<h3 class="reco-title">${title}</h3>${items.length?`<div class="book-grid">${shown.map((i,k)=>posterCard(i,`data-rk="${kind}" data-ri="${k}"`,kind==='book'?[i.authors.join(' · '),i.year].filter(Boolean).join(' · '):when(i),kind==='book'?[i.reason]:(i.match.length?i.match:i.genres))).join('')}</div>${items.length>12&&!more[kind]?`<div class="actions"><button type="button" data-more="${kind}">Afficher les ${items.length-12} suivants</button></div>`:''}`:`<p class="hint">${empty}</p>`}`;
 }
 function render(root){
  const m=mediaOn(),p=prefs(),n=N();
  const movies=m&&feed?feed.feed.filter(i=>i.kind==='movie'&&!owned(i)):[],series=m&&feed?feed.feed.filter(i=>i.kind==='series'&&!owned(i)):[];
  const eff=effectiveGenres(p,lib()),hasGenres=eff.movie.length+eff.series.length+eff.book.length>0;
  if(!booksRec&&!busy.books&&st.books)loadBooks(false);
  let html=`<div class="section-heading"><h2>Pour vous</h2><p>${busy.feed?'Recherche des nouveautés…':checkedAt?'Dernière vérification : '+new Date(checkedAt).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'}):''}</p></div><div class="actions reco-actions"><button type="button" class="primary" data-r="prefs">Mes préférences</button>${m?`<button type="button" data-r="refresh" ${busy.feed?'disabled':''}>Actualiser</button>`:`<button type="button" data-r="refresh-books" ${busy.books?'disabled':''}>Autres suggestions</button>`}</div>`;
  if(message)html+=`<p class="hint" role="status">${esc(message)}</p>`;
  if(!hasGenres)html+='<div class="notice">Cochez vos genres préférés dans « Mes préférences » ou notez vos titres (4 étoiles ou plus) : les suggestions seront plus justes.</div>';
  if(m){
   if(!keyOn())html+='<div class="notice">Les films et séries à venir demandent une clé TMDB gratuite à renseigner dans config.js (voir le guide). Les épisodes de vos séries en cours fonctionnent sans clé.</div>';
   else{
    html+=section('movie','Films : sorties récentes et à venir',movies,busy.feed?'Recherche en cours…':'Aucun film trouvé pour ces genres. Essayez d’autres genres dans vos préférences.');
    html+=section('series','Nouvelles séries',series,busy.feed?'Recherche en cours…':'Aucune nouvelle série trouvée pour ces genres.');
   }
   const eps=feed?feed.episodes:[];
   html+=`<h3 class="reco-title">Vos séries en cours</h3>${eps.length?`<ul class="episodes">${eps.map(e=>`<li><a href="${esc(e.url)}" target="_blank" rel="noopener noreferrer">${esc(e.show)}</a> · ${e.number?`saison ${e.season}, épisode ${e.number}`:'nouvel épisode'}${e.premiere?' (nouvelle saison)':''} · ${e.when==='aired'?'disponible':e.when==='today'?'aujourd’hui':e.when==='tomorrow'?'demain':n?n.frDate(e.date):e.date}</li>`).join('')}</ul>`:'<p class="hint">Aucun épisode annoncé dans les 30 prochains jours pour les séries que vous suivez (statut « En cours » ou « Terminée », fiche TVmaze ou TMDB).</p>'}`;
  }
  html+=booksRec?section('book','Livres à découvrir',booksRec,booksMsg||'Cochez des genres ou notez vos livres (4 étoiles ou plus) pour recevoir des suggestions.'):`<h3 class="reco-title">Livres à découvrir</h3><p class="hint">${busy.books?'Recherche de livres…':'…'}</p>`;
  html+=`<p class="hint media-credit">${m?'Films et séries : <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer">TMDB</a> — ce produit utilise l’API TMDB mais n’est ni approuvé ni certifié par TMDB. Dates indicatives : la sortie en France peut différer. Épisodes : TVmaze. ':''}Livres : Open Library. Les suggestions sont calculées sur votre appareil à partir de vos genres et de vos notes ; vos notes ne sont jamais envoyées aux catalogues.</p>`;
  root.innerHTML=html;
  root.querySelectorAll('[data-r]').forEach(b=>b.onclick=()=>{const a=b.dataset.r;if(a==='prefs')openPrefs();else if(a==='refresh')checkNews(true);else{booksRec=null;loadBooks(true)}});
  root.querySelectorAll('[data-more]').forEach(b=>b.onclick=()=>{more[b.dataset.more]=true;h.render()});
  root.querySelectorAll('[data-rk]').forEach(b=>b.onclick=()=>{const k=b.dataset.rk,i=Number(b.dataset.ri),list=k==='movie'?movies:k==='series'?series:booksRec;if(list&&list[i])k==='book'?bookDetail(list[i]):mediaDetail(list[i])});
  h.images();
 }
 function mediaDetail(i){
  const imdb=`https://www.imdb.com/find/?q=${encodeURIComponent(i.title+(i.year?' '+i.year:''))}&s=tt&ttype=${i.kind==='movie'?'ft':'tv'}`;
  const token=h.open(i.title,`<div class="book-detail"><div>${posterCard(i,'tabindex="-1"','',[]).replace('<button','<div').replace('</button>','</div>')}</div><div><p>${esc([i.year,i.kind==='movie'?'Film':'Série'].filter(Boolean).join(' · '))}</p><p>${i.date?esc(when(i)):''}</p>${i.genres.map(g=>`<span class="tag">${esc(g)}</span>`).join('')}${i.vote?`<p class="hint">Note du public TMDB : ${i.vote.toFixed(1)} / 10</p>`:''}</div></div><h3>Résumé</h3><p class="media-text">${esc(i.overview||'Résumé non disponible en français.')}</p><div class="actions"><button type="button" class="primary" id="recoAdd">${i.kind==='movie'?'Ajouter à mes films à voir':'Ajouter à mes séries à voir'}</button></div><p class="hint"><a href="${esc(imdb)}" target="_blank" rel="noopener noreferrer">Chercher sur IMDb</a> · <a href="${esc(i.url)}" target="_blank" rel="noopener noreferrer">Fiche TMDB</a></p>`);
  document.querySelector('#recoAdd').onclick=()=>{if(token!==h.generation())return;h.editMedia({kind:i.kind,title:i.title,year:i.year,genres:i.genres,description:i.overview,poster:i.poster,source:'TMDB',sourceUrl:i.url,catalogId:i.catalogId,status:'unwatched'})};
  h.images();
 }
 function bookDetail(b){
  h.open(b.title,`<div class="book-detail"><div>${posterCard(b,'tabindex="-1"','',[]).replace('<button','<div').replace('</button>','</div>')}</div><div><p>${esc(b.authors.join(' · ')||'Auteur non renseigné')}</p><p>${esc(b.year)}</p><p class="hint">${esc(b.reason)}</p></div></div><div class="actions"><button type="button" class="primary" id="recoAddBook">Ajouter à mes envies</button></div>${b.url?`<p class="hint"><a href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">Voir sur Open Library</a></p>`:''}<p class="hint">Vérifiez l’édition (langue, ISBN) avant d’enregistrer : la fiche s’ouvre pour relecture.</p>`);
  document.querySelector('#recoAddBook').onclick=()=>h.openBook({title:b.title,authors:b.authors,published:b.year,cover:b.cover,genres:b.genre?[b.genre]:[],wish:true,owned:false,status:'unread',source:'Open Library'});
  h.images();
 }
 function openPrefs(){
  if(st.mode!=='cloud'&&st.mode!=='local')return;
  const p=prefs(),m=mediaOn();
  const group=(name,labels,sel)=>`<div class="chips">${labels.map(l=>`<label class="chip"><input type="checkbox" name="${name}" value="${esc(l)}" ${sel.includes(l)?'checked':''}><span>${esc(l)}</span></label>`).join('')}</div>`;
  const flag=(name,label,v)=>`<label class="check-label"><input type="checkbox" name="${name}" ${v?'checked':''}> ${label}</label>`;
  h.open('Mes préférences',`<form id="prefsForm" class="prefs"><p class="hint">Cochez ce qui vous plaît : Lisière vous suggère des titres et peut vous prévenir. Vous pouvez tout modifier plus tard.</p><h3>Livres</h3>${group('gb',BOOK_LABELS,p.genresBook)}${m?`<h3>Films</h3>${group('gm',MOVIE_LABELS,p.genresMovie)}<h3>Séries</h3>${group('gs',TV_LABELS,p.genresSeries)}`:''}<div class="prefs-flags">${flag('useLibrary','Tenir compte de ce que j’ai bien noté (4 étoiles ou plus)',p.useLibrary)}</div>${m?`<h3>Notifications</h3><p class="hint" id="notifStatus">${esc(pwa.notifLabel())}</p><div class="prefs-flags">${flag('notifyMovies','Nouveaux films de mes genres',p.notifyMovies)}${flag('notifySeries','Nouvelles séries de mes genres',p.notifySeries)}${flag('notifyFollowed','Nouveaux épisodes et saisons de mes séries en cours',p.notifyFollowed)}</div><div class="actions"><button type="button" id="notifEnable">Activer sur cet appareil</button><button type="button" id="notifTest">Envoyer un test</button></div><p class="hint">La vérification a lieu à l’ouverture de Lisière, et en arrière-plan sur Android quand le système le permet. Ce n’est pas une alerte instantanée.</p>`:''}<div id="prefsError" class="notice error hidden" role="alert"></div><div class="actions"><button type="submit" class="primary">Enregistrer</button><button type="button" id="prefsCancel">Annuler</button></div></form>`);
  const form=document.querySelector('#prefsForm'),vals=name=>[...form.querySelectorAll(`input[name="${name}"]:checked`)].map(i=>i.value),on=name=>Boolean(form.elements[name]?.checked);
  document.querySelector('#prefsCancel').onclick=()=>h.close();
  const status=()=>{const s=document.querySelector('#notifStatus');if(s)s.textContent=pwa.notifLabel()};
  if(m){
   document.querySelector('#notifEnable').onclick=e=>h.busy(e.target,async()=>{try{const r=await pwa.enableNotifications();status();h.toast(r==='granted'?'Notifications activées sur cet appareil.':'Notifications non autorisées.')}catch(err){status();h.toast(err instanceof Error?err.message:'Notifications indisponibles.')}});
   document.querySelector('#notifTest').onclick=e=>h.busy(e.target,async()=>{if(pwa.notifState()!=='granted'){h.toast('Activez d’abord les notifications.');return}await pwa.showLocal([{key:'test-'+Date.now(),title:'Lisière',body:'Les notifications fonctionnent sur cet appareil.'}])});
  }
  form.onsubmit=e=>{e.preventDefault();h.busy(e.submitter||form.querySelector('[type=submit]'),async()=>{
   try{
    await store.savePrefs(normalizePrefs({genresBook:vals('gb'),genresMovie:m?vals('gm'):p.genresMovie,genresSeries:m?vals('gs'):p.genresSeries,useLibrary:on('useLibrary'),notifyMovies:m?on('notifyMovies'):p.notifyMovies,notifySeries:m?on('notifySeries'):p.notifySeries,notifyFollowed:m?on('notifyFollowed'):p.notifyFollowed}));
    booksRec=null;autoDone=false;checkedAt=0;h.close();h.toast('Préférences enregistrées.');
   }catch(err){const b=document.querySelector('#prefsError');if(b){b.textContent=err instanceof Error?err.message:'Enregistrement impossible.';b.classList.remove('hidden')}}
  })};
 }
 return{sync,render,openPrefs,checkNews,reset(){feed=null;booksRec=null}};
}
