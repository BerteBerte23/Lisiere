// Installation (Android / iPhone) et notifications locales. Aucune donnée n'est envoyée à un serveur de notifications.
let deferred=null;const listeners=new Set();
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferred=e;listeners.forEach(f=>f())});
window.addEventListener('appinstalled',()=>{deferred=null;listeners.forEach(f=>f())});
export const onInstallChange=fn=>{listeners.add(fn);return()=>listeners.delete(fn)};
export function platform(){const ua=navigator.userAgent||'';if(/iPhone|iPad|iPod/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1))return'ios';if(/Android/i.test(ua))return'android';return'desktop'}
export const standalone=()=>{try{return matchMedia('(display-mode: standalone)').matches||navigator.standalone===true}catch{return false}};
export const canPrompt=()=>Boolean(deferred);
export async function promptInstall(){if(!deferred)return'unavailable';const d=deferred;deferred=null;d.prompt();let r;try{r=await d.userChoice}catch{r={outcome:'dismissed'}}listeners.forEach(f=>f());return r.outcome}
export function installSteps(){
 const p=platform();
 if(standalone())return'<p>L’application est déjà installée sur cet appareil.</p>';
 if(p==='ios')return'<ol><li>Ouvrez Lisière dans <b>Safari</b>.</li><li>Touchez le bouton <b>Partager</b> (le carré avec une flèche vers le haut).</li><li>Choisissez <b>Sur l’écran d’accueil</b>, puis <b>Ajouter</b>.</li><li>Ouvrez ensuite Lisière depuis son icône : c’est nécessaire pour les notifications (iOS 16.4 ou plus récent).</li></ol>';
 if(p==='android')return'<ol><li>Ouvrez Lisière dans <b>Chrome</b> (ou Samsung Internet).</li><li>Touchez le bouton ci-dessous « Installer l’application », ou le menu <b>⋮</b> puis <b>Installer l’application</b> / <b>Ajouter à l’écran d’accueil</b>.</li><li>Ouvrez Lisière depuis son icône.</li></ol>';
 return'<ol><li>Dans Chrome, Edge ou Safari, utilisez l’icône d’installation de la barre d’adresse, ou le menu <b>Partager → Ajouter au Dock</b> (Safari sur Mac).</li></ol>';
}
// Bloc HTML + gestionnaire du bouton d'installation.
export function installBlock(){return`<div class="install-steps">${installSteps()}${!standalone()&&canPrompt()?'<div class="actions"><button type="button" class="primary" data-install>Installer l’application</button></div>':''}</div>`}
export function bindInstall(root,done){root.querySelectorAll('[data-install]').forEach(b=>b.onclick=async()=>{b.disabled=true;await promptInstall();done?.()})}

export const notifSupported=()=>'Notification' in window&&'serviceWorker' in navigator;
export const notifState=()=>notifSupported()?Notification.permission:'unsupported';
export async function enableNotifications(){
 if(!notifSupported())throw Error(platform()==='ios'?'Sur iPhone, installez d’abord Lisière sur l’écran d’accueil (Partager → Sur l’écran d’accueil), puis ouvrez-la depuis son icône.':'Ce navigateur ne propose pas les notifications.');
 const p=await Notification.requestPermission();
 if(p==='granted')await registerPeriodic();
 return p;
}
export async function registerPeriodic(){try{const reg=await navigator.serviceWorker.ready;if(reg.periodicSync)await reg.periodicSync.register('lisiere-news',{minInterval:12*3600*1000})}catch{/* Non disponible : la vérification se fait à l’ouverture. */}}
export async function showLocal(list){
 if(notifState()!=='granted')return false;
 const reg=await navigator.serviceWorker.ready;
 for(const n of list)await reg.showNotification(String(n.title).slice(0,100),{body:String(n.body).slice(0,300),icon:'./icons/icon-192.png',badge:'./icons/icon-192.png',tag:n.key,data:{url:n.url||'./#reco'}});
 return true;
}
export const notifLabel=()=>({granted:'Activées sur cet appareil',denied:'Bloquées : autorisez-les dans les réglages du navigateur ou du téléphone',default:'Pas encore activées',unsupported:platform()==='ios'?'Disponibles seulement quand Lisière est installée sur l’écran d’accueil (iOS 16.4 ou plus récent)':'Non disponibles dans ce navigateur'}[notifState()]);
