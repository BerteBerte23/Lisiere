import {CONFIG} from '../config.js';
import {normalizeBook,safeImage} from './model.js';
const KEY='lisiere-local-v1';let mode='none',books=[],db,auth,fs,fa,stop,notify=()=>{},session=0;
export const configured=()=>Boolean(CONFIG.firebase.apiKey&&CONFIG.firebase.projectId&&CONFIG.firebase.authDomain&&CONFIG.firebase.appId&&CONFIG.ownerUid);
export const getState=()=>({mode,books:[...books],email:auth?.currentUser?.email||''});
export function subscribe(fn){notify=fn;emit()}
function emit(extra={}){notify({...getState(),...extra})}
export function useLocal(){stop?.();mode='local';session++;try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');books=Array.isArray(raw)?raw.map(b=>normalizeBook(b)):[]}catch{throw Error('Sauvegarde locale illisible. Ne la supprimez pas ; récupérez un export avant toute intervention.')}emit()}
export function clearLocal(){if(mode!=='local')return;localStorage.removeItem(KEY);books=[];emit()}
export async function initCloud(){if(!configured()){emit();return}const version='11.10.0';const [app,a,f]=await Promise.all([import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)]);fa=a;fs=f;auth=a.getAuth(app.initializeApp(CONFIG.firebase));await a.setPersistence(auth,a.browserLocalPersistence);db=f.getFirestore();a.onAuthStateChanged(auth,async user=>{if(!user&&mode==='local'){emit();return}stop?.();books=[];session++;if(!user){mode='none';emit();return}if(user.uid!==CONFIG.ownerUid){await a.signOut(auth);emit({error:'Ce compte n’est pas autorisé pour cette bibliothèque.'});return}mode='cloud';emit({loading:true});stop=f.onSnapshot(f.collection(db,'users',user.uid,'books'),snapshot=>{books=snapshot.docs.map(d=>{try{return normalizeBook({...d.data(),id:d.id})}catch{return null}}).filter(Boolean);emit()},()=>emit({error:'Lecture impossible. Vérifiez la connexion et les règles Firestore.'}))})}
export async function login(email,password){if(!auth)throw Error('Connexion Firebase indisponible. Vérifiez la configuration et le réseau.');try{await fa.signInWithEmailAndPassword(auth,email,password)}catch{throw Error('Connexion impossible. Vérifiez les identifiants et réessayez plus tard.')}}
export async function resetPassword(email){if(!auth||!email)throw Error('Renseignez votre adresse e-mail.');try{await fa.sendPasswordResetEmail(auth,email)}catch{/* Réponse générique pour éviter l’énumération des comptes. */}}
export async function logout(){stop?.();session++;books=[];mode='none';emit();if(auth?.currentUser)await fa.signOut(auth)}
export async function saveBook(raw){const b=normalizeBook(raw);if(mode==='local'){const next=books.filter(x=>x.id!==b.id).concat(b);try{localStorage.setItem(KEY,JSON.stringify(next))}catch{throw Error('Stockage local plein ou bloqué. Exportez votre bibliothèque.')}books=next;emit();return b}if(mode!=='cloud'||auth.currentUser?.uid!==CONFIG.ownerUid)throw Error('Connectez-vous avant d’enregistrer.');await fs.setDoc(fs.doc(db,'users',auth.currentUser.uid,'books',b.id),b);return b}
export async function removeBook(id){if(mode==='local'){const next=books.filter(b=>b.id!==id);localStorage.setItem(KEY,JSON.stringify(next));books=next;emit();return}if(mode!=='cloud'||auth.currentUser?.uid!==CONFIG.ownerUid)throw Error('Connexion nécessaire.');await fs.deleteDoc(fs.doc(db,'users',auth.currentUser.uid,'books',id))}
export async function importBooks(items){if(mode==='none')throw Error('Connectez-vous ou activez le mode local.');const currentSession=session;for(const b of items){if(currentSession!==session)throw Error('Session modifiée : import interrompu.');await saveBook(b)}}

// Modification ciblée : jamais de création ni de remplacement des autres champs.
export async function updateCover(id,url){
 const cover=safeImage(url);
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id)||!cover||cover.length>2000)throw Error('Couverture invalide.');
 const updatedAt=new Date().toISOString();
 if(mode==='local'){
  const b=books.find(b=>b.id===id);
  if(!b)throw Error('Ce livre n’existe plus.');
  if(b.cover)throw Error('Une couverture a déjà été ajoutée. Elle a été conservée.');
  const next=books.map(b=>b.id===id?{...b,cover,updatedAt}:b);
  try{localStorage.setItem(KEY,JSON.stringify(next))}catch{throw Error('Stockage local plein ou bloqué. Exportez votre bibliothèque.')}
  books=next;emit();return;
 }
 if(mode!=='cloud'||auth?.currentUser?.uid!==CONFIG.ownerUid)throw Error('Connectez-vous avant d’enregistrer.');
 const currentSession=session,uid=auth.currentUser.uid;
 const ref=fs.doc(db,'users',uid,'books',id);
 await fs.runTransaction(db,async tx=>{
  const snapshot=await tx.get(ref);
  if(currentSession!==session||mode!=='cloud'||auth.currentUser?.uid!==uid)throw Error('Session modifiée : enregistrement annulé.');
  if(!snapshot.exists())throw Error('Ce livre n’existe plus.');
  if(snapshot.data().cover)throw Error('Une couverture a déjà été ajoutée. Elle a été conservée.');
  tx.update(ref,{cover,updatedAt});
 });
}
