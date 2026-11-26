import { fromUrl } from '../../packages/core/video.js';
import { record,exact } from '../../packages/security/fields.js';
import { request,type Request } from '../../packages/protocol/messages.js';
import { reply,type Reply } from '../../packages/protocol/results.js';
import { management,devices,type Devices,type Management } from '../../packages/protocol/peers.js';

const panel = chrome.runtime.getURL('panel.html');
let port: chrome.runtime.Port | undefined;
let waiting: ((result:Reply|Devices)=>void) | undefined;
let opening = false;
function send(message:Request|Management): Promise<Reply|Devices> {
  if (waiting) return Promise.resolve({ok:false,error:'busy'});
  if (!chrome.runtime.connectNative) return Promise.resolve({ok:false,error:'unavailable'});
  return new Promise(resolve=>{
    const timer = setTimeout(()=>{ port?.disconnect(); port=undefined; waiting?.({ok:false,error:'unavailable'}); },10000);
    waiting = result=>{clearTimeout(timer); waiting=undefined; resolve(result);};
    try {
      if (!port) {
        const connection = chrome.runtime.connectNative('org.downloadit.host');
        port = connection;
        connection.onMessage.addListener((data:unknown)=>{
          if (connection===port) waiting?.(reply(data)||devices(data)?data:{ok:false,error:'invalid'});
        });
        connection.onDisconnect.addListener(()=>{
          void chrome.runtime.lastError;
          if (connection===port) {port=undefined; waiting?.({ok:false,error:'unavailable'});}
        });
      }
      port.postMessage(message);
    } catch { waiting?.({ok:false,error:'unavailable'}); }
  });
}
chrome.runtime.onMessage.addListener((value:unknown,sender,respond)=>{
  if (sender.id!==chrome.runtime.id || sender.frameId!==0 || !sender.url) return false;
  if (sender.url.split('?')[0]===panel && (request(value)||management(value))) {
    void send(value).then(respond);
    return true;
  }
  if (!opening && sender.tab?.id!==undefined && record(value) && exact(value,['op','id','format']) &&
      value.op==='open' && typeof value.id==='string' && fromUrl(sender.url)===value.id &&
      (value.format==='mp3'||value.format==='mp4')) {
    opening=true;
    void chrome.tabs.create({url:panel+'?id='+value.id+'&format='+value.format})
      .finally(()=>setTimeout(()=>{opening=false;},750));
  }
  return false;
});
chrome.action?.onClicked.addListener(()=>{void chrome.tabs.create({url:panel});});
