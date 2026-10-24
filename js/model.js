export const GENRES=['Roman','Policier / Thriller','Romance','New Romance','Fantasy','Science-fiction','Historique','Contemporain','Littérature générale','Biographie','Essai','BD / Manga','Jeunesse'];
export const STATUSES={unread:'Non lu',reading:'En cours',read:'Terminé'};
export const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function safeImage(url){try{const u=new URL(url);return u.protocol==='https:'&&['books.google.com','books.google.fr','books.googleusercontent.com','covers.openlibrary.org','iadice.com',...Array.from({length:5},(_,i)=>`is${i+1}-ssl.mzstatic.com`)].includes(u.hostname)?u.href:''}catch{return ''}}
export function validISBN(value){const s=String(value).replace(/[-\s]/g,'').toUpperCase();if(/^\d{13}$/.test(s))return /^97[89]/.test(s)&&[...s].reduce((a,c,i)=>a+Number(c)*(i%2?3:1),0)%10===0;if(/^\d{9}[\dX]$/.test(s))return [...s].reduce((a,c,i)=>a+(c==='X'?10:Number(c))*(10-i),0)%11===0;return false}
export function normalizeBook(raw,{keepId=true}={}){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Fiche invalide.');
 const text=(k,max)=>String(raw[k]??'').trim().slice(0,max);
 const title=text('title',250);if(!title)throw Error('Le titre est obligatoire.');
 const list=(v,max,n)=>[...new Set((Array.isArray(v)?v:String(v||'').split(';')).map(x=>String(x).trim().slice(0,max)).filter(Boolean))].slice(0,n);
 const int=(k,max)=>Math.max(0,Math.min(max,Math.floor(Number(raw[k])||0)));
 const date=k=>{const s=text(k,10);return /^\d{4}-\d{2}-\d{2}$/.test(s)&&!isNaN(Date.parse(s))?s:''};
 const id=keepId&&/^[a-zA-Z0-9_-]{1,100}$/.test(raw.id||'')?raw.id:crypto.randomUUID();
 const now=new Date().toISOString();
 const b={id,title,authors:list(raw.authors,120,10),genres:list(raw.genres,60,12),description:text('description',12000),publisher:text('publisher',200),published:text('published',40),pages:int('pages',50000),isbn:validISBN(raw.isbn)?String(raw.isbn).replace(/[-\s]/g,'').toUpperCase():'',cover:safeImage(raw.cover),status:Object.hasOwn(STATUSES,raw.status)?raw.status:'unread',owned:raw.owned===true,wish:raw.wish===true,series:text('series',200),volume:int('volume',10000),rating:int('rating',5),notes:text('notes',10000),started:date('started'),finished:date('finished'),source:['Google Books','Open Library','Manuel'].includes(raw.source)?raw.source:'Manuel',createdAt:typeof raw.createdAt==='string'&&/^\d{4}-\d{2}-\d{2}T/.test(raw.createdAt)&&!isNaN(Date.parse(raw.createdAt))?raw.createdAt:now,updatedAt:now};
 if(b.started&&b.finished&&b.finished<b.started)throw Error('La fin de lecture doit suivre le début.');return b;
}
export function inShelf(b,s){return s==='all'||s==='read'&&b.status==='read'||s==='owned'&&b.owned&&b.status!=='read'||s==='wish'&&b.wish}
export function filterBooks(books,{shelf='all',query='',genre='',status='',sort='recent'}={}){const q=norm(query);const coll=new Intl.Collator('fr',{sensitivity:'base',numeric:true});return books.filter(b=>inShelf(b,shelf)&&(!q||norm([b.title,...b.authors,b.series,...b.genres].join(' ')).includes(q))&&(!genre||b.genres.includes(genre))&&(!status||b.status===status)).sort((a,b)=>{let r=0;if(sort==='author')r=coll.compare(a.authors.join(', '),b.authors.join(', '));else if(sort==='title')r=coll.compare(a.title,b.title);else if(sort==='series')r=coll.compare(a.series||'\uffff',b.series||'\uffff')||a.volume-b.volume;else if(sort==='rating')r=b.rating-a.rating;else r=b.createdAt.localeCompare(a.createdAt);return r||coll.compare(a.title,b.title)})}
export function duplicate(books,b){return books.find(x=>x.id!==b.id&&(b.isbn&&x.isbn===b.isbn||norm(x.title)===norm(b.title)&&norm(x.authors.join(' '))===norm(b.authors.join(' '))))}
export function parseImport(text){const parsed=JSON.parse(text);if(parsed?.format!=='lisiere'||parsed?.version!==1||!Array.isArray(parsed.books))throw Error('Choisissez un export Lisière version 1.');if(parsed.books.length>2000)throw Error('Import limité à 2 000 livres.');return parsed.books.map(b=>normalizeBook(b))}
