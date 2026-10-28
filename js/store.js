import {CONFIG} from '../config.js';
import {normalizeBook,safeImage} from './model.js';
const KEY='lisiere-local-v1';
let mode='none',books=[],db,auth,fs,fa,stop,notify=()=>{},session=0,cloudUid='';
const profileFor=uid=>Array.isArray(CONFIG.profiles)?CONFIG.profiles.find(p=>p.uid===uid):null;
export const configured=()=>Boolean(CONFIG.firebase.apiKey&&CONFIG.firebase.projectId&&CONFIG.firebase.authDomain&&CONFIG.firebase.appId&&CONFIG.profiles?.length===2&&new Set(CONFIG.profiles.map(p=>p.uid)).size===2&&CONFIG.profiles.every(p=>/^[a-zA-Z0-9_-]{1,128}$/.test(p.uid)));
export const getState=()=>({mode,books:[...books],uid:cloudUid,session,email:mode==='cloud'?auth?.currentUser?.email||'':'',profile:mode==='cloud'&&profileFor(cloudUid)?{...profileFor(cloudUid)}:null});
export function subscribe(fn){notify=fn;emit()}
function emit(extra={}){notify({...getState(),...extra})}
function reset(){stop?.();stop=null;books=[];cloudUid='';mode='none';session++}
function context(){const uid=auth?.currentUser?.uid;if(mode!=='cloud'||uid!==cloudUid||!profileFor(uid))throw Error('Connectez-vous avant d’enregistrer.');return{uid,session}}
function checkContext(c){if(c.session!==session||mode!=='cloud'||cloudUid!==c.uid||auth?.currentUser?.uid!==c.uid||!profileFor(c.uid))throw Error('Session modifiée : opération annulée.');}
export function useLocal(){reset();mode='local';try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');books=Array.isArray(raw)?raw.map(b=>normalizeBook(b)):[]}catch{mode='none';emit();throw Error('Sauvegarde locale illisible. Ne la supprimez pas ; récupérez un export avant toute intervention.')}emit()}
export function clearLocal(){if(mode!=='local')return;localStorage.removeItem(KEY);books=[];emit()}
export async function initCloud(){
 if(!configured()){emit();return}
 const version='11.10.0';
 const [app,a,f]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)]);
 fa=a;fs=f;auth=a.getAuth(app.initializeApp(CONFIG.firebase));await a.setPersistence(auth,a.browserLocalPersistence);db=f.getFirestore();
 a.onAuthStateChanged(auth,async user=>{
  if(!user&&mode==='local'){emit();return}
  reset();
  if(!user){emit();return}
  if(!profileFor(user.uid)){const attempt=session;emit({error:'Ce compte n’est pas autorisé pour cette application.'});try{await a.signOut(auth)}catch{if(attempt===session)emit({error:'Compte non autorisé. Réessayez la déconnexion.'})}return}
  const uid=user.uid,currentSession=session;cloudUid=uid;mode='cloud';emit({loading:true});
  stop=f.onSnapshot(f.collection(db,'users',uid,'books'),snapshot=>{
   if(currentSession!==session||mode!=='cloud'||cloudUid!==uid||auth?.currentUser?.uid!==uid)return;
   books=snapshot.docs.map(d=>{try{return normalizeBook({...d.data(),id:d.id})}catch{return null}}).filter(Boolean);emit();
  },()=>{if(currentSession===session&&cloudUid===uid)emit({error:'Lecture impossible. Vérifiez la connexion et les règles Firestore.'})});
 });
}
export async function login(email,password){if(!auth)throw Error('Connexion Firebase indisponible. Vérifiez la configuration et le réseau.');try{await fa.signInWithEmailAndPassword(auth,email,password)}catch{throw Error('Connexion impossible. Vérifiez les identifiants et réessayez plus tard.')}}
export async function resetPassword(email){if(!auth||!email)throw Error('Renseignez votre adresse e-mail.');try{await fa.sendPasswordResetEmail(auth,email)}catch{/* Message générique : pas d’énumération des comptes. */}}
export async function logout(){reset();emit();if(auth?.currentUser)await fa.signOut(auth)}
export async function saveBook(raw){const b=normalizeBook(raw);if(mode==='local'){const next=books.filter(x=>x.id!==b.id).concat(b);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{throw Error('Stockage local plein ou bloqué. Exportez votre bibliothèque.')}books=next;emit();return b}const c=context();await fs.setDoc(fs.doc(db,'users',c.uid,'books',b.id),b);checkContext(c);return b}
export async function removeBook(id){if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Identifiant de livre invalide.');if(mode==='local'){const next=books.filter(b=>b.id!==id);localStorage.setItem(KEY,JSON.stringify(next));books=next;emit();return}const c=context();await fs.deleteDoc(fs.doc(db,'users',c.uid,'books',id));checkContext(c)}
export async function importBooks(items){if(mode==='none')throw Error('Connectez-vous ou activez le mode local.');const currentSession=session;for(const b of items){if(currentSession!==session)throw Error('Session modifiée : import interrompu.');await saveBook(b)}}
// Modification ciblée : jamais de création ni de remplacement des autres champs.
export async function updateCover(id,url){
 const cover=safeImage(url);if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!cover||cover.length>2000)throw Error('Couverture invalide.');const updatedAt=new Date().toISOString();
 if(mode==='local'){const b=books.find(b=>b.id===id);if(!b)throw Error('Ce livre n’existe plus.');if(b.cover)throw Error('Une couverture a déjà été ajoutée. Elle a été conservée.');const next=books.map(b=>b.id===id?{...b,cover,updatedAt}:b);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{throw Error('Stockage local plein ou bloqué. Exportez votre bibliothèque.')}books=next;emit();return}
 const c=context();const ref=fs.doc(db,'users',c.uid,'books',id);
 await fs.runTransaction(db,async tx=>{const snapshot=await tx.get(ref);checkContext(c);if(!snapshot.exists())throw Error('Ce livre n’existe plus.');if(snapshot.data().cover)throw Error('Une couverture a déjà été ajoutée. Elle a été conservée.');tx.update(ref,{cover,updatedAt})});checkContext(c);
}
