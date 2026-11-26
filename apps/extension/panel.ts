import { videoId,quality, audioRates,videoHeights,type Format } from '../../packages/core/video.js';
import { reply,type Reply,type Fault } from '../../packages/protocol/results.js';
import type { Request } from '../../packages/protocol/messages.js';
import {devices,type Management} from '../../packages/protocol/peers.js';
import {scan} from './scanner.js';

const es = navigator.language.startsWith('es');
document.documentElement.lang = es?'es':'en';
const t = (en:string,sp:string)=>es?sp:en;
const messages:Record<Fault,string> = {
 unavailable:t('Companion unavailable. On Android, share the video to Download IT.','Aplicación no disponible. En Android, comparte el video con Download IT.'),
 unsupported:t('A compatible authorized stream or verified converter is unavailable.','Falta una transmisión compatible autorizada o un conversor verificado.'),
 network:t('Network request failed.','Falló la conexión.'),storage:t('Check available storage.','Comprueba el almacenamiento disponible.'),
 interrupted:t('Interrupted. Retry to resume.','Interrumpido. Reintenta para continuar.'),duplicate:t('Already in history.','Ya está en el historial.'),
 limit:t('Queue, size or retry limit reached.','Se alcanzó el límite de cola, tamaño o intentos.'),busy:t('Companion is busy.','La aplicación está ocupada.'),invalid:t('Invalid response.','Respuesta no válida.')
};
const labels={queued:t('Queued','En cola'),running:t('Downloading','Descargando'),done:t('Completed','Completado'),failed:t('Failed','Fallido'),cancelled:t('Cancelled','Cancelado')};
const form=document.querySelector<HTMLElement>('#form')!;
const status=document.querySelector<HTMLElement>('#status')!;
const list=document.querySelector<HTMLOListElement>('#jobs')!;
const params=new URLSearchParams(location.search);
const id=params.get('id');
function select(label:string,options:[string,string][],parent:HTMLElement=form) {
  const wrapper=document.createElement('label'); wrapper.textContent=label;
  const input=document.createElement('select');
  for (const [value,text] of options) input.add(new Option(text,value));
  wrapper.append(input);parent.append(wrapper);return input;
}
const destination=select(t('Download destination','Destino de descarga'),[['desktop',t('This PC','Este equipo')]]);
const format=select(t('Format','Formato'),[['mp3','MP3'],['mp4','MP4']]);
format.value=params.get('format')==='mp3'?'mp3':'mp4';
const profile=select(t('Quality','Calidad'),[]);
const coverLabel=document.createElement('label'),cover=document.createElement('input');
cover.type='checkbox';coverLabel.append(cover,t('Embed cover artwork','Incluir portada'));form.append(coverLabel);
void chrome.storage.local.get('artwork').then(p=>{cover.checked=p.artwork===true;});
cover.onchange=()=>void chrome.storage.local.set({artwork:cover.checked});
async function profiles() {
  const kind=format.value as Format;
  coverLabel.hidden=kind!=='mp3';
  const saved=await chrome.storage.local.get(kind);
  if(format.value!==kind)return;
  profile.replaceChildren();
  for(const n of kind==='mp3'?audioRates:videoHeights) profile.add(new Option(n+(kind==='mp3'?' kbps':'p'),String(n)));
  profile.value=String(quality(kind,saved[kind])?saved[kind]:(kind==='mp3'?192:720));
}
format.onchange=()=>void profiles();
profile.onchange=()=>void chrome.storage.local.set({[format.value]:Number(profile.value)});
void profiles();
if(videoId(id)) {
  const button=document.createElement('button');button.className='primary';
  button.textContent=t('Download authorized media','Descargar contenido autorizado');
  const info=document.createElement('p');info.textContent=t('Video ID ','ID de video ')+id;
  form.append(info,button);
  button.onclick=()=>void act({v:1,op:'submit',id,format:format.value as Format,quality:Number(profile.value),target:destination.value,
    ...(format.value==='mp3'?{artwork:cover.checked}:{})});
}
let active=false;
let last='';
function render(result:Extract<Reply,{ok:true}>) {
  const key=JSON.stringify(result.jobs);if(key===last)return;last=key;
  list.replaceChildren();
  for(const item of result.jobs.slice().reverse()){
    const row=document.createElement('li'), title=document.createElement('span');
    title.textContent=item.id+' · '+item.format.toUpperCase()+' '+item.quality+' · '+labels[item.state]+(item.error?' · '+messages[item.error]:'');
    row.append(title);
    if(item.state==='running'){const bar=document.createElement('progress');bar.max=100;bar.value=item.progress;bar.setAttribute('aria-label',labels.running);row.append(bar);}
    if(item.state!=='done'){
      const op=item.state==='running'||item.state==='queued'?'cancel':'retry';
      const button=document.createElement('button');button.textContent=op==='cancel'?t('Cancel','Cancelar'):t('Retry','Reintentar');
      button.onclick=()=>void act({v:1,op,job:item.job,target:destination.value});row.append(button);
    }
    list.append(row);
  }
}
async function act(message:Request){
  if(active)return;active=true;
  try{
    const data:unknown=await chrome.runtime.sendMessage(message);
    if(!reply(data))throw Error();
    if(data.ok){render(data);if(message.op!=='list'||status.dataset.connection==='lost')status.textContent='';delete status.dataset.connection;}
    else {status.textContent=messages[data.error];if(message.op==='list')status.dataset.connection='lost';}
  }catch{status.textContent=messages.unavailable;status.dataset.connection='lost';}finally{active=false;}
}
document.querySelector('#heading')!.textContent=t('Download history','Historial de descargas');
const clear=document.querySelector<HTMLButtonElement>('#clear')!;
clear.textContent=t('Clear finished history','Borrar historial finalizado');
clear.onclick=()=>void act({v:1,op:'clear',target:destination.value});
const refresh=()=>void act({v:1,op:'list',target:destination.value});
const controls=document.createElement('section'),heading=document.createElement('h2');
heading.textContent=t('Paired devices','Dispositivos vinculados');
const pair=document.createElement('button'),forget=document.createElement('button'),preview=document.createElement('video');
pair.textContent=t('Scan Android QR','Escanear QR de Android');
forget.textContent=t('Forget selected device','Olvidar dispositivo seleccionado');
preview.style.maxWidth='100%';preview.playsInline=true;
controls.append(heading,pair,forget,preview);document.querySelector('main')!.append(controls);
let scanning:AbortController|undefined;
async function manage(message:Management){
  if(active)return;active=true;
  try{
    const data:unknown=await chrome.runtime.sendMessage(message);
    if(!devices(data)){status.textContent=reply(data)&&!data.ok?messages[data.error]:messages.invalid;return;}
    const preferred=(await chrome.storage.local.get('destination')).destination;
    destination.length=1;
    for(const id of data.devices)destination.add(new Option('Android · '+id.slice(0,8),id));
    destination.value=typeof preferred==='string'&&data.devices.includes(preferred)?preferred:(data.devices[0]??'desktop');
    if(preferred==='desktop')destination.value='desktop';
    forget.disabled=destination.value==='desktop';last='';status.textContent='';
  }catch{status.textContent=messages.unavailable;}finally{active=false;}
}
destination.onchange=()=>{void chrome.storage.local.set({destination:destination.value});forget.disabled=destination.value==='desktop';last='';refresh();};
forget.onclick=()=>void manage({v:1,op:'forget',id:destination.value});
pair.onclick=async()=>{
  if(scanning){scanning.abort();return;}
  scanning=new AbortController();const timer=setTimeout(()=>scanning?.abort(),90000);
  pair.textContent=t('Stop camera','Detener cámara');
  try{const offer=await scan(preview,scanning.signal);if(!scanning.signal.aborted)await manage({v:1,op:'pair',offer});}
  catch{status.textContent=t('Scan ended. Check camera access and the QR expiry.','Escaneo finalizado. Comprueba la cámara y la vigencia del QR.');}
  finally{clearTimeout(timer);scanning=undefined;pair.textContent=t('Scan Android QR','Escanear QR de Android');}
};
window.addEventListener('pagehide',()=>scanning?.abort());
void manage({v:1,op:'peers'}).then(refresh);
setInterval(()=>{if(!document.hidden&&!scanning)refresh();},3000);
