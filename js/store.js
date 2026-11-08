import {normalizeMedia} from './media-model.js';
import {CONFIG} from '../config.js';
import {normalizeBook,safeImage} from './model.js';
import {normalizePrefs,defaultPrefs} from './prefs-model.js';
const KEY='lisiere-local-v1';
const PREFS_KEY='lisiere-prefs-local-v1';
let mode='none',books=[],db,auth,fs,fa,stop,stopMedia,media=[],notify=()=>{},session=0,cloudUid='',prefs=null;
const profileFor=uid=>Array.isArray(CONFIG.profiles)?CONFIG.profiles.find(p=>p.uid===uid):null;
export const configured=()=>Boolean(CONFIG.firebase.apiKey&&CONFIG.firebase.projectId&&CONFIG.firebase.authDomain&&CONFIG.firebase.appId&&CONFIG.profiles?.length>=1&&new Set(CONFIG.profiles.map(p=>p.uid)).size===CONFIG.profiles.length&&CONFIG.profiles.every(p=>/^[a-zA-Z0-9_-]{1,128}$/.test(p.uid)));
export const getState=()=>({mode,books:[...books],media:[...media],prefs:prefs?{...prefs}:null,prefsReady:prefs!==null,uid:cloudUid,session,email:mode==='cloud'?auth?.currentUser?.email||'':'',profile:mode==='cloud'&&profileFor(cloudUid)?{...profileFor(cloudUid)}:null});
export function subscribe(fn){notify=fn;emit()}
function emit(extra={}){notify({...getState(),...extra})}
function reset(){stop?.();stopMedia?.();stop=null;stopMedia=null;books=[];media=[];prefs=null;cloudUid='';mode='none';session++}
function context(){const uid=auth?.currentUser?.uid;if(mode!=='cloud'||uid!==cloudUid||!profileFor(uid))throw Error('Connectez-vous avant d’enregistrer.');return{uid,session}}
function checkContext(c){if(c.session!==session||mode!=='cloud'||cloudUid!==c.uid||auth?.currentUser?.uid!==c.uid||!profileFor(c.uid))throw Error('Session modifiée : opération annulée.');}
export function useLocal(){reset();mode='local';try{try{prefs=normalizePrefs(JSON.parse(localStorage.getItem(PREFS_KEY)||'{}'))}catch{prefs=defaultPrefs()}const raw=JSON.parse(localStorage.getItem(KEY)||'[]');books=Array.isArray(raw)?raw.map(b=>normalizeBook(b)):[]}catch{mode='none';emit();throw Error('Sauvegarde locale illisible. Ne la supprimez pas ; récupérez un export avant toute intervention.')}emit()}
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
  // Préférences : un échec (règles non publiées) ne bloque jamais la bibliothèque.
  f.getDoc(f.doc(db,'users',uid,'prefs','main')).then(snap=>{if(currentSession!==session||cloudUid!==uid)return;prefs=snap.exists()?normalizePrefs(snap.data()):defaultPrefs();emit()}).catch(()=>{if(currentSession!==session||cloudUid!==uid)return;prefs=defaultPrefs();emit()});
  if(profileFor(uid)?.media===true)stopMedia=f.onSnapshot(f.collection(db,'users',uid,'media'),snapshot=>{
   if(currentSession!==session||mode!=='cloud'||cloudUid!==uid||auth?.currentUser?.uid!==uid)return;
   media=snapshot.docs.map(d=>{try{return normalizeMedia({...d.data(),id:d.id})}catch{return null}}).filter(Boolean);emit();
  },()=>{if(currentSession===session&&cloudUid===uid)emit({error:'Films et séries indisponibles. Vérifiez le réseau et les nouvelles règles Firestore.'})});
  stop=f.onSnapshot(f.collection(db,'users',uid,'books'),snapshot=>{
   if(currentSession!==session||mode!=='cloud'||cloudUid!==uid||auth?.currentUser?.uid!==uid)return;
   books=snapshot.docs.map(d=>{try{return normalizeBook({...d.data(),id:d.id})}catch{return null}}).filter(Boolean);emit();
  },()=>{if(currentSession===session&&cloudUid===uid)emit({error:'Lecture impossible. Vérifiez la connexion et les règles Firestore.'})});
 });
}
export async function login(email,password){if(!auth)throw Error('Connexion Firebase indisponible. Vérifiez la configuration et le réseau.');try{await fa.signInWithEmailAndPassword(auth,email,password)}catch{throw Error('Connexion impossible. Vérifiez les identifiants et réessayez plus tard.')}}
export async function resetPassword(email){if(!auth||!email)throw Error('Renseignez votre adresse e-mail.');try{await fa.sendPasswordResetEmail(auth,email)}catch{/* Message générique : pas d’énumération des comptes. */}}
// Changement de mot de passe par la personne elle-même. Firebase exige une ressaisie récente du mot de passe actuel.
export async function changePassword(current,next){
 const user=auth?.currentUser;
 if(mode!=='cloud'||!user||!user.email)throw Error('Connectez-vous pour changer votre mot de passe.');
 if(typeof current!=='string'||!current)throw Error('Saisissez votre mot de passe actuel.');
 if(typeof next!=='string'||next.length<8||next.length>128)throw Error('Le nouveau mot de passe doit contenir entre 8 et 128 caractères.');
 if(next===current)throw Error('Le nouveau mot de passe doit être différent de l’actuel.');
 try{await fa.reauthenticateWithCredential(user,fa.EmailAuthProvider.credential(user.email,current))}
 catch(e){const c=e?.code||'';throw Error(c==='auth/network-request-failed'?'Réseau indisponible. Réessayez.':c==='auth/too-many-requests'?'Trop de tentatives. Patientez quelques minutes avant de réessayer.':'Mot de passe actuel incorrect.')}
 try{await fa.updatePassword(user,next)}
 catch(e){const c=e?.code||'';throw Error(c==='auth/weak-password'?'Mot de passe trop faible. Choisissez-en un plus long ou plus varié.':c==='auth/network-request-failed'?'Réseau indisponible. Réessayez.':'Changement impossible. Réessayez dans un instant.')}
}
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

// Films et séries : collection indépendante, uniquement le profil habilité.
export function canMedia(){return mode==='cloud'&&profileFor(cloudUid)?.media===true}
function mediaContext(){const c=context();if(!canMedia())throw Error('Films et séries ne sont pas activés pour ce compte.');return c}
export async function saveMedia(raw){const c=mediaContext(),m=normalizeMedia(raw);await fs.setDoc(fs.doc(db,'users',c.uid,'media',m.id),m);checkContext(c);return m}
export async function removeMedia(id){const c=mediaContext();if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Identifiant invalide.');await fs.deleteDoc(fs.doc(db,'users',c.uid,'media',id));checkContext(c)}
export async function importLibrary(bookItems,mediaItems){const c=mediaItems.length?mediaContext():null,currentSession=session;let added=0,skipped=0;await importBooks(bookItems);for(const raw of mediaItems){if(session!==currentSession)throw Error('Session modifiée : import interrompu.');checkContext(c);const m=normalizeMedia(raw),ref=fs.doc(db,'users',c.uid,'media',m.id);const created=await fs.runTransaction(db,async tx=>{const snap=await tx.get(ref);checkContext(c);if(snap.exists())return false;tx.set(ref,m);return true});checkContext(c);if(created)added++;else skipped++;}return{added,skipped}}

// Transaction ciblée : images et attribution seulement, jamais le suivi personnel.
export async function updatePoster(id,candidate){
 const c=mediaContext();if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw Error('Identifiant invalide.');
 const image=normalizeMedia({...candidate,id});if(!image.poster)throw Error('Image invalide ou attribution manquante.');
 const patch={poster:image.poster,imageCredit:image.imageCredit,imageSourceUrl:image.imageSourceUrl,imageLicenseUrl:image.imageLicenseUrl,updatedAt:new Date().toISOString()};
 const ref=fs.doc(db,'users',c.uid,'media',id);
 await fs.runTransaction(db,async tx=>{const snap=await tx.get(ref);checkContext(c);if(!snap.exists())throw Error('Cette fiche n’existe plus.');const current=snap.data();if(current.kind!==image.kind)throw Error('Le type de fiche ne correspond pas.');if(current.poster)throw Error('Une image a déjà été ajoutée. Elle a été conservée.');tx.update(ref,patch)});checkContext(c);
}

// Préférences de recommandations et de notifications.
export async function savePrefs(raw){
 const p=normalizePrefs(raw);
 if(mode==='local'){try{localStorage.setItem(PREFS_KEY,JSON.stringify(p))}catch{throw Error('Stockage local plein ou bloqué.')}prefs=p;emit();return p}
 const c=context();
 try{await fs.setDoc(fs.doc(db,'users',c.uid,'prefs','main'),p)}catch{throw Error('Enregistrement impossible. Vérifiez la connexion et que les nouvelles règles Firestore sont publiées.')}
 checkContext(c);prefs=p;emit();return p;
}
