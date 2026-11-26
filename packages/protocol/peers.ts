import {exact,record} from '../security/fields.js';
import {uuid} from './messages.js';
export const secret=(s:unknown):s is string=>typeof s==='string'&&s.length===43&&/^[A-Za-z0-9_-]+$/.test(s);
export type Offer={v:1;ip:string;cert:string;challenge:string};
export function offer(x:unknown):x is Offer {
  if(!record(x)||!exact(x,['v','ip','cert','challenge'])||x.v!==1||typeof x.ip!=='string'||!secret(x.challenge)||
    typeof x.cert!=='string'||x.cert.length<256||x.cert.length>2048||!/^[a-zA-Z0-9+/]+=*$/.test(x.cert))return false;
  const a=x.ip.split('.').map(Number);
  return a.length===4 && a.join('.')===x.ip && a.every(n=>Number.isInteger(n)&&n>=0&&n<=255) &&
    (a[0]===10 || a[0]===192&&a[1]===168 || a[0]===172&&a[1]!>=16&&a[1]!<=31);
}
export type Management={v:1;op:'peers'}|{v:1;op:'pair';offer:Offer}|{v:1;op:'forget';id:string};
export type Devices={ok:true;devices:string[]};
export function management(x:unknown):x is Management{
  if(!record(x)||x.v!==1)return false;
  return x.op==='peers'&&exact(x,['v','op'])||x.op==='pair'&&exact(x,['v','op','offer'])&&offer(x.offer)||
    x.op==='forget'&&exact(x,['v','op','id'])&&uuid(x.id);
}
export function devices(x:unknown):x is Devices{
  return record(x)&&exact(x,['ok','devices'])&&x.ok===true&&Array.isArray(x.devices)&&x.devices.length<=8&&x.devices.every(uuid);
}
