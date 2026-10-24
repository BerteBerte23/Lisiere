import { CONFIG } from '../config.js';
import { normalizeBook,validISBN,norm,safeImage } from './model.js';
const TIMEOUT=18000;
let queue=Promise.resolve(),lastRequest=0,appleQueue=Promise.resolve(),lastAppleRequest=0;
async function json(url){const run=async()=>{if(new URL(url).hostname==='openlibrary.org'){const delay=Math.max(0,1100-(Date.now()-lastRequest));if(delay)await new Promise(r=>setTimeout(r,delay));lastRequest=Date.now()}const r=await fetch(url,{signal:AbortSignal.timeout(TIMEOUT),credentials:'omit',referrerPolicy:'no-referrer'});if(!r.ok)throw Error('Catalogue momentanément indisponible.');return r.json()};if(new URL(url).hostname==='itunes.apple.com'){const task=appleQueue.then(async()=>{const delay=Math.max(0,3200-(Date.now()-lastAppleRequest));if(delay)await new Promise(r=>setTimeout(r,delay));lastAppleRequest=Date.now();return run()});appleQueue=task.catch(()=>{});return task}if(new URL(url).hostname!=='openlibrary.org')return run();const task=queue.then(run);queue=task.catch(()=>{});return task}
function suggestedGenres(subjects=[]){const text=norm(subjects.join(' ; '));const matches=[['Policier / Thriller',/thriller|mystery|detective|policier/],['Romance',/romance|love stories/],['New Romance',/new romance/],['Fantasy',/fantasy|fantastique/],['Science-fiction',/science fiction|science-fiction/],['Historique',/historical fiction|roman historique/],['Biographie',/biograph|memoir/],['BD / Manga',/manga|comics|graphic novel|bande dessinee/],['Jeunesse',/juvenile|children|jeunesse/]];return matches.filter(([,re])=>re.test(text)).map(([name])=>name).slice(0,8)}
function plain(s){return new DOMParser().parseFromString(String(s||''),'text/html').body.textContent||''}
export async function searchCatalog(query){query=query.trim().slice(0,200);if(!query)throw Error('Saisissez un titre, un auteur ou un ISBN.');const isbn=validISBN(query)?query.replace(/[-\s]/g,''):'';let googleFailed=false;
 if(CONFIG.googleBooksApiKey){try{const u=new URL('https://www.googleapis.com/books/v1/volumes');u.search=new URLSearchParams({q:isbn?`isbn:${isbn}`:query,maxResults:'16',printType:'books',key:CONFIG.googleBooksApiKey});const data=await json(u);if(data.items?.length)return{source:'Google Books',items:data.items.map(v=>{const i=v.volumeInfo||{};return normalizeBook({title:i.title||'Sans titre',authors:i.authors,description:plain(i.description),publisher:i.publisher,published:i.publishedDate,pages:i.pageCount,isbn:(i.industryIdentifiers||[]).find(x=>x.type==='ISBN_13')?.identifier||(i.industryIdentifiers||[])[0]?.identifier,cover:(i.imageLinks?.thumbnail||'').replace(/^http:/,'https:'),genres:suggestedGenres(i.categories||[]),source:'Google Books'})})};googleFailed=true}catch{googleFailed=true}}
 if(isbn){const data=await json(`https://openlibrary.org/isbn/${isbn}.json`).catch(()=>null);if(data){const authors=await Promise.all((data.authors||[]).slice(0,5).map(a=>/^\/authors\/OL\d+A$/.test(a.key)?json(`https://openlibrary.org${a.key}.json`).then(x=>x.name||'').catch(()=>''):''));return{source:'Open Library',fallback:googleFailed,items:[normalizeBook({title:data.title,authors,isbn,description:typeof data.description==='string'?data.description:data.description?.value,publisher:data.publishers?.join(', '),published:data.publish_date,pages:data.number_of_pages,cover:`https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`,source:'Open Library',olWork:data.works?.[0]?.key})],works:[data.works?.[0]?.key||'']}}}
 const u=new URL('https://openlibrary.org/search.json');u.search=new URLSearchParams({q:isbn?`isbn:${isbn}`:query,limit:'16',lang:'fr',fields:'key,title,author_name,cover_i,first_publish_year'});const data=await json(u);return{source:'Open Library',fallback:googleFailed,items:(data.docs||[]).map(d=>normalizeBook({title:d.title,authors:d.author_name,published:d.first_publish_year,cover:d.cover_i?`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`:'',source:'Open Library'})),works:(data.docs||[]).map(d=>d.key)};
}
export async function enrichOpenLibrary(book,work){if(!/^\/works\/OL\d+W$/.test(work||''))return book;try{const d=await json(`https://openlibrary.org${work}.json`);return{...book,genres:book.genres.length?book.genres:suggestedGenres(d.subjects||[]),description:book.description||plain(typeof d.description==='string'?d.description:d.description?.value).slice(0,12000)}}catch{return book}}

// Recherche de couvertures séparée de l’ajout de livres : aucune fiche n’est créée.
const OFFICIAL_COVERS=[{"title": "Trop inacceptable", "authors": ["I. A. Dice"], "published": "", "publisher": "", "language": "fr", "source": "Site officiel I. A. Dice", "cover": "https://iadice.com/wp-content/uploads/2025/06/Trop_Inacceptable.jpg", "sourceUrl": "https://iadice.com/books/trop-inacceptable/"}, {"title": "Trop gentil", "authors": ["I. A. Dice"], "published": "", "publisher": "", "language": "fr", "source": "Site officiel I. A. Dice", "cover": "https://iadice.com/wp-content/uploads/2025/06/Trop_Gentil.jpg", "sourceUrl": "https://iadice.com/books/trop-gentil/"}, {"title": "Trop fort", "authors": ["I. A. Dice"], "published": "", "publisher": "", "language": "fr", "source": "Site officiel I. A. Dice", "cover": "https://iadice.com/wp-content/uploads/2025/06/Trop_Fort.jpg", "sourceUrl": "https://iadice.com/books/trop-fort/"}, {"title": "Trop dur", "authors": ["I. A. Dice"], "published": "", "publisher": "", "language": "fr", "source": "Site officiel I. A. Dice", "cover": "https://iadice.com/wp-content/uploads/2025/06/Trop_Dur.jpg", "sourceUrl": "https://iadice.com/books/trop-dur/"}, {"title": "Trop long", "authors": ["I. A. Dice"], "published": "", "publisher": "", "language": "fr", "source": "Site officiel I. A. Dice", "cover": "https://iadice.com/wp-content/uploads/2025/06/Trop_Long.jpg", "sourceUrl": "https://iadice.com/books/trop-long/"}];
export async function searchCovers(book,query=''){
 const q=String(query||book.isbn||[book.title,...book.authors].join(' ')).trim().slice(0,200);
 if(!q)throw Error('Saisissez un titre, un auteur ou un ISBN.');
 const isbn=validISBN(q)?q.replace(/[-\s]/g,''):'';
 const ol=new URL('https://openlibrary.org/search.json');
 ol.search=new URLSearchParams({q:isbn?`isbn:${isbn}`:q,limit:'16',lang:'fr',fields:'title,author_name,cover_i,first_publish_year,language'});
 const gb=new URL('https://www.googleapis.com/books/v1/volumes');
 const params={q:isbn?`isbn:${isbn}`:q,maxResults:'16',printType:'books'};
 if(CONFIG.googleBooksApiKey)params.key=CONFIG.googleBooksApiKey;
 gb.search=new URLSearchParams(params);
 const apple=new URL('https://itunes.apple.com/search');apple.search=new URLSearchParams({term:q,entity:'ebook',country:'fr',limit:'16'});
 const results=await Promise.allSettled([json(ol),json(gb),json(apple)]);
 const items=OFFICIAL_COVERS.filter(i=>norm(i.title)===norm(book.title)&&norm(book.authors.join(' ')).replace(/[^a-z]/g,'')==='iadice').map(i=>({...i})),warnings=[];
 if(results[0].status==='fulfilled')for(const d of results[0].value.docs||[]){
  if(!Number.isSafeInteger(d.cover_i)||d.cover_i<=0)continue;
  items.push({title:String(d.title||'Titre non renseigné').slice(0,250),authors:Array.isArray(d.author_name)?d.author_name.map(String).slice(0,10):[],published:String(d.first_publish_year||''),publisher:'',language:Array.isArray(d.language)?d.language.slice(0,4).join(', '):'',source:'Open Library',cover:`https://covers.openlibrary.org/b/id/${d.cover_i}-L.jpg?default=false`});
 }else warnings.push('Open Library indisponible');
 if(results[1].status==='fulfilled')for(const d of results[1].value.items||[]){
  const i=d.volumeInfo||{},cover=safeImage(String(i.imageLinks?.thumbnail||i.imageLinks?.smallThumbnail||'').replace(/^http:/,'https:'));
  if(!cover)continue;
  items.push({title:String(i.title||'Titre non renseigné').slice(0,250),authors:Array.isArray(i.authors)?i.authors.map(String).slice(0,10):[],published:String(i.publishedDate||'').slice(0,40),publisher:String(i.publisher||'').slice(0,200),language:String(i.language||'').slice(0,20),source:'Google Books',cover});
 }else warnings.push('Google Books indisponible ou quota atteint');
 if(results[2].status==='fulfilled')for(const d of results[2].value.results||[]){
  const raw=String(d.artworkUrl100||d.artworkUrl60||'');
  const cover=safeImage(raw.replace(/\/\d+x\d+bb[.]jpg$/, '/600x600bb.jpg'));
  if(!cover)continue;
  items.push({title:String(d.trackName||'Titre non renseigné').slice(0,250),authors:[String(d.artistName||'').slice(0,120)],published:String(d.releaseDate||'').slice(0,10),publisher:'',language:'Catalogue France · édition à vérifier',source:'Apple Books',cover});
 }else warnings.push('Apple Books indisponible');
 const titleNorm=norm(book.title).replace(/[^a-z0-9]+/g,' ').trim();
 const authorNorm=norm(book.authors.join(' ')).replace(/[^a-z0-9]+/g,' ').trim();
 const score=i=>{const t=norm(i.title).replace(/[^a-z0-9]+/g,' ').trim(),a=norm(i.authors.join(' ')).replace(/[^a-z0-9]+/g,' ').trim();return (t===titleNorm?8:t.includes(titleNorm)||titleNorm.includes(t)?4:0)+(authorNorm&&a.includes(authorNorm)?4:0)};
 items.sort((a,b)=>score(b)-score(a));
 const unique=[...new Map(items.map(i=>[i.cover,i])).values()].slice(0,32);
 if(!unique.length&&results.every(r=>r.status==='rejected'))throw Error('Les catalogues sont indisponibles. Réessayez plus tard ; aucun livre n’a été modifié.');
 return{items:unique,warnings};
}
