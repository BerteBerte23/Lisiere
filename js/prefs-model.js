// Préférences de recommandations et de notifications (un document par compte : users/{uid}/prefs/main).
import {GENRES,norm} from './model.js';
const N=globalThis.LisiereNews||{MOVIE_GENRES:{},TV_GENRES:{}};
export const BOOK_LABELS=[...GENRES];
export const MOVIE_LABELS=Object.keys(N.MOVIE_GENRES);
export const TV_LABELS=Object.keys(N.TV_GENRES);
export const defaultPrefs=()=>({genresBook:[],genresMovie:[],genresSeries:[],useLibrary:true,notifyMovies:true,notifySeries:true,notifyFollowed:true,updatedAt:''});
const pick=(v,allowed)=>[...new Set((Array.isArray(v)?v:[]).filter(x=>allowed.includes(x)))].slice(0,20);
export function normalizePrefs(raw){
 const r=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{},d=defaultPrefs(),flag=(k)=>typeof r[k]==='boolean'?r[k]:d[k];
 return{genresBook:pick(r.genresBook,BOOK_LABELS),genresMovie:pick(r.genresMovie,MOVIE_LABELS),genresSeries:pick(r.genresSeries,TV_LABELS),useLibrary:flag('useLibrary'),notifyMovies:flag('notifyMovies'),notifySeries:flag('notifySeries'),notifyFollowed:flag('notifyFollowed'),updatedAt:new Date().toISOString()};
}
// Genres libres (anglais ou français, selon le catalogue d'origine) -> libellés cochables.
const MOVIE_RULES=[['Action',/action/],['Aventure',/adventure|aventure/],['Animation',/anim/],['Comédie',/comed/],['Crime',/crime|policier/],['Documentaire',/documentar/],['Drame',/drama|drame/],['Familial',/famil/],['Fantastique',/fantas/],['Histoire',/histor/],['Horreur',/horror|horreur|epouvante/],['Musique',/music|musical/],['Mystère',/myster/],['Romance',/romanc/],['Science-fiction',/science|sci-fi/],['Thriller',/thriller|suspense/],['Guerre',/\bwar\b|guerre/],['Western',/western/]];
const TV_RULES=[['Action & aventure',/action|adventure|aventure/],['Animation',/anim|anime/],['Comédie',/comed/],['Crime',/crime|legal|policier/],['Documentaire',/documentar/],['Drame',/drama|drame|medical|romanc/],['Familial',/famil|children|jeunesse/],['Mystère',/myster|thriller|horror|supernatural|horreur/],['Science-fiction & fantastique',/science|sci-fi|fantas/],['Guerre & politique',/\bwar\b|guerre|histor|politic/],['Western',/western/]];
const canon=(genres,rules)=>{const t=norm((genres||[]).join(' ; '));return rules.filter(([,re])=>re.test(t)).map(([l])=>l)};
const liked=x=>x.rating>=4;
export function effectiveGenres(prefs,{books=[],media=[]}={}){
 const p={...defaultPrefs(),...prefs},use=p.useLibrary!==false;
 const uni=(a,b)=>[...new Set([...a,...b])];
 return{
  book:uni(p.genresBook,use?books.filter(liked).flatMap(b=>(b.genres||[]).filter(g=>BOOK_LABELS.includes(g))):[]),
  movie:uni(p.genresMovie,use?media.filter(m=>m.kind==='movie'&&liked(m)).flatMap(m=>canon(m.genres,MOVIE_RULES)):[]),
  series:uni(p.genresSeries,use?media.filter(m=>m.kind==='series'&&liked(m)).flatMap(m=>canon(m.genres,TV_RULES)):[])
 };
}
