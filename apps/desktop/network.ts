import { resolve4 } from 'node:dns/promises';
import { get } from 'node:https';
import type { IncomingMessage } from 'node:http';
import { isIPv4 } from 'node:net';
import type { Fault } from '../../packages/protocol/results.js';

export class Failure extends Error {
  constructor(readonly code:Fault) {super(code);}
}
function publicAddress(ip:string):boolean {
  if(!isIPv4(ip))return false;
  const [a,b,c]=ip.split('.').map(Number) as [number,number,number,number];
  return !(a===0 || a===10 || a===127 || a>=224 || a===100&&b>=64&&b<=127 ||
    a===169&&b===254 || a===172&&b>=16&&b<=31 || a===192&&(b===168||b===0||
    b===88&&c===99||b===31&&c===196||b===52&&c===193||b===175&&c===48) ||
    a===198&&(b===18||b===19||b===51&&c===100) || a===203&&b===0&&c===113);
}
export async function resource(raw:string,kind:'watch'|'media'|'cover',signal:AbortSignal):Promise<IncomingMessage>{
  if(raw.length>8192)throw new Failure('unsupported');
  const url=new URL(raw);
  const allowed=kind==='watch'?url.hostname==='www.youtube.com'&&url.pathname==='/watch':
    kind==='cover'?url.hostname==='i.ytimg.com'&&/^\/vi\/[a-zA-Z0-9_-]{11}\/hqdefault\.jpg$/.test(url.pathname)&&!url.search:
    /^[a-z0-9-]+\.googlevideo\.com$/.test(url.hostname)&&url.pathname==='/videoplayback';
  if(!allowed||url.protocol!=='https:'||url.username||url.password||url.port||url.hash)throw new Failure('unsupported');
  const addresses=await resolve4(url.hostname);
  signal.throwIfAborted();
  if(!addresses.length||!addresses.every(publicAddress))throw new Failure('network');
  // Dial the inspected IP. SNI and certificate identity remain bound to the DNS name.
  return new Promise((resolve,reject)=>{
    const req=get({hostname:addresses[0],port:443,servername:url.hostname,headers:{Host:url.hostname,'Accept-Encoding':'identity'},
      path:url.pathname+url.search,agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',signal,timeout:15000},res=>{
      if(res.statusCode!==200 || (res.headers['content-encoding']??'identity')!=='identity'){
        res.destroy();reject(new Failure('network'));return;
      }
      resolve(res);
    });
    req.once('timeout',()=>req.destroy(new Failure('network')));
    req.once('error',()=>reject(new Failure('network')));
  });
}
