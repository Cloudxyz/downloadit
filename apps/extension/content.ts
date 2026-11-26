import { fromUrl } from '../../packages/core/video.js';

let host: HTMLElement | undefined;
let currentId: string | undefined;
let scheduled = false;
const spanish = navigator.language.startsWith('es');
function mount() {
  scheduled = false;
  const id = fromUrl(location.href);
  if (!id) { host?.remove(); host = undefined; return; }
  const anchor = document.querySelector('ytd-watch-metadata #actions, ytmusic-player-bar .middle-controls, ytd-reel-video-renderer[is-active] #actions, ytm-slim-video-action-bar-renderer');
  if (id === currentId && host?.isConnected && host.parentElement === (anchor ?? document.body)) return;
  host?.remove();
  currentId = id;
  host = document.createElement('div');
  const root = host.attachShadow({mode:'closed'});
  const style = document.createElement('style');
  style.textContent = `:host{display:inline-flex;position:relative;z-index:1;color-scheme:light dark}:host([data-floating]){position:fixed;bottom:4.5rem;right:1rem;z-index:2100}.group{display:flex;gap:4px;padding:3px;border-radius:24px;background:Canvas;color:CanvasText;box-shadow:0 0 0 1px #8886}button{color:inherit;background:transparent;border:0;padding:9px 12px;border-radius:20px;font:600 13px system-ui;cursor:pointer}button:hover,button:focus-visible{background:#8883}`;
  const group = document.createElement('div');
  group.className = 'group';
  for (const format of ['mp3','mp4'] as const) {
    const button = document.createElement('button');
    button.textContent = (spanish ? 'Descargar ' : 'Download ') + format.toUpperCase();
    button.onclick = event => {
      if (!event.isTrusted || fromUrl(location.href) !== id) return;
      if (/Android/i.test(navigator.userAgent) && navigator.share) {
        void navigator.share({url:'https://www.youtube.com/watch?v='+id}).catch(() => {});
      } else {
        void chrome.runtime.sendMessage({op:'open',id,format}).catch(() => {
          button.textContent = spanish ? 'Recarga la página' : 'Reload this page';
        });
      }
    };
    group.append(button);
  }
  root.append(style,group);
  host.toggleAttribute('data-floating',!anchor);
  (anchor ?? document.body).append(host);
}
function schedule() {
  if (!scheduled) { scheduled = true; requestAnimationFrame(mount); }
}
if (globalThis.chrome?.runtime?.id && window.top === window) {
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  for (const event of ['yt-navigate-finish','yt-page-data-updated','popstate','pageshow']) window.addEventListener(event,schedule);
  mount();
}
