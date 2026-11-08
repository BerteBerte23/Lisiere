// Tutoriel de démarrage : s'affiche à chaque lancement jusqu'à ce que la personne le termine
// ou coche « Ne plus afficher au démarrage ». On peut le revoir à tout moment depuis les Réglages.
import {esc} from './model.js';
import * as pwa from './pwa.js';
const KEY='lisiere-tuto-v1:';
export function createTutorial(h){
 let shown=false;
 const key=()=>KEY+(h.state().uid||'local');
 const read=()=>{try{return localStorage.getItem(key())}catch{return null}};
 const write=v=>{try{v===null?localStorage.removeItem(key()):localStorage.setItem(key(),v)}catch{}};
 const enabled=()=>read()!=='off';
 function steps(){
  const s=h.state(),media=s.mode==='cloud'&&s.profile?.media===true,who=s.profile?.label||'';
  const list=[
   {t:`Bienvenue${who?' '+esc(who):''}`,b:`<p>Lisière garde la trace de vos ${media?'livres, films et séries':'livres'} : ce que vous avez aimé, ce qui vous attend, ce que vous voulez découvrir.</p><p>Ce guide prend moins d’une minute. Vous pouvez l’arrêter à tout moment et le revoir depuis <b>Réglages</b>.</p>`},
   {t:'Ajouter un livre',b:'<p>Touchez <b>＋ Ajouter un livre</b>, puis :</p><ul><li><b>Rechercher</b> par titre, auteur ou ISBN ;</li><li><b>Scanner</b> le code-barres au dos du livre ;</li><li><b>Photo de couverture</b> pour retrouver un titre.</li></ul><p>Chaque fiche garde votre statut (non lu, en cours, terminé), votre note et vos impressions.</p>'}
  ];
  if(media)list.push({t:'Films et séries',b:'<p>Les onglets <b>Films</b> et <b>Séries</b> fonctionnent comme la bibliothèque : cherchez un titre, choisissez la bonne fiche, puis suivez-le (à voir, en cours, vu).</p><p>Pour une série, notez le dernier épisode vu : Lisière s’en sert pour vous prévenir des nouveaux épisodes.</p>'});
  list.push({t:'Pour vous : des idées adaptées',b:`<p>L’onglet <b>Pour vous</b> propose des ${media?'films, séries et ':''}livres selon les genres que vous cochez et ce que vous avez bien noté (4 étoiles ou plus).</p><p>Touchez <b>Mes préférences</b> pour cocher vos genres. Touchez une suggestion pour l’ajouter à votre liste.</p>`});
  if(media)list.push({t:'Être prévenu des nouveautés',b:`<p>Lisière peut vous notifier quand un film ou une série de vos genres sort, et quand un épisode de vos séries en cours arrive.</p><p>Activez-les dans <b>Mes préférences</b>. La vérification se fait à l’ouverture de l’application, et en arrière-plan sur Android quand le système le permet. Ce n’est pas une alerte instantanée.</p>${pwa.platform()==='ios'?'<p>Sur iPhone, installez d’abord Lisière sur l’écran d’accueil.</p>':''}`,action:{label:'Régler mes préférences',go:'prefs'}});
  list.push({t:'Installer sur le téléphone',b:`<p>Lisière s’installe comme une application, sans magasin d’applications :</p>${pwa.installBlock()}`});
  list.push({t:'C’est parti',b:'<p>Vous pouvez revoir ce guide quand vous voulez : <b>Réglages → Revoir le tutoriel</b>.</p>'});
  return list;
 }
 function show(i=0){
  const list=steps(),n=list.length,step=list[Math.max(0,Math.min(n-1,i))],last=i>=n-1;
  h.open('Guide de démarrage',`<div class="tuto"><p class="hint">Étape ${i+1} sur ${n}</p><div class="tuto-dots" aria-hidden="true">${list.map((_,k)=>`<span class="${k===i?'on':''}"></span>`).join('')}</div><h3>${step.t}</h3>${step.b}${step.action?`<div class="actions"><button type="button" id="tutoAction">${esc(step.action.label)}</button></div>`:''}<label class="check-label tuto-off"><input type="checkbox" id="tutoOff" ${enabled()?'':'checked'}> Ne plus afficher au démarrage</label><div class="actions"><button type="button" id="tutoPrev" ${i?'':'disabled'}>Précédent</button>${last?'<button type="button" id="tutoNext" class="primary">Terminer</button>':'<button type="button" id="tutoNext" class="primary">Suivant</button><button type="button" id="tutoSkip">Passer</button>'}</div></div>`);
  const off=document.querySelector('#tutoOff');
  off.onchange=()=>write(off.checked?'off':null);
  document.querySelector('#tutoPrev').onclick=()=>show(i-1);
  document.querySelector('#tutoNext').onclick=()=>{if(last){write('off');h.close()}else show(i+1)};
  if(!last)document.querySelector('#tutoSkip').onclick=()=>h.close();
  if(step.action)document.querySelector('#tutoAction').onclick=()=>{h.close();h.go(step.action.go)};
  pwa.bindInstall(document.querySelector('#modalBody'),()=>show(i));
 }
 return{
  start:()=>show(0),
  maybeStart(){const s=h.state();if(shown||s.mode==='none'||s.loading||!enabled())return;shown=true;setTimeout(()=>{const st=h.state();if(st.mode!=='none'&&!st.loading&&!document.querySelector('#modal').open)show(0)},700)},
  reset(){shown=false},enabled,setEnabled:v=>write(v?null:'off')
 };
}
