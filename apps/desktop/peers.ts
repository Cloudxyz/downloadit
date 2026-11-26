import {X509Certificate,randomUUID} from 'node:crypto';
import {connect} from 'node:tls';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {existsSync,readFileSync,writeFileSync,renameSync,lstatSync} from 'node:fs';
import {join} from 'node:path';
import {exact,record} from '../../packages/security/fields.js';
import {uuid,type Request} from '../../packages/protocol/messages.js';
import {secret,offer,type Offer,type Devices,type Management} from '../../packages/protocol/peers.js';
import {reply,type Reply} from '../../packages/protocol/results.js';
import {Failure} from './network.js';

type Peer={id:string;ip:string;cert:string;token:string};
const vault=()=>join(process.env.LOCALAPPDATA!,'DownloadIT','devices.bin');
function protect(mode:'protect'|'unprotect',value:Buffer):Buffer{
  const result=spawnSync(fileURLToPath(new URL('./DownloadIT.exe',import.meta.url)),[mode],{input:value,windowsHide:true,shell:false,maxBuffer:65536,timeout:4000});
  if(result.status!==0)throw new Failure('storage');
  return result.stdout;
}
function peers():Peer[]{
  if(!existsSync(vault()))return [];
  const info=lstatSync(vault());
  if(!info.isFile()||info.size>65536)throw new Failure('storage');
  const data:unknown=JSON.parse(protect('unprotect',readFileSync(vault())).toString('utf8'));
  if(!Array.isArray(data)||data.length>8||!data.every(x=>record(x)&&exact(x,['id','ip','cert','token'])&&uuid(x.id)&&
    offer({v:1,ip:x.ip,cert:x.cert,challenge:x.token})))throw new Failure('storage');
  return data as Peer[];
}
function save(data:Peer[]){
  const path=vault()+'.'+randomUUID()+'.tmp';
  writeFileSync(path,protect('protect',Buffer.from(JSON.stringify(data))),{flag:'wx',mode:0o600,flush:true});renameSync(path,vault());
}
async function exchange(peer:Pick<Offer,'ip'|'cert'>,payload:object):Promise<unknown>{
  const cert=new X509Certificate(Buffer.from(peer.cert,'base64'));
  const socket=connect({host:peer.ip,port:42189,minVersion:'TLSv1.3',maxVersion:'TLSv1.3',ca:cert.toString(),rejectUnauthorized:true,
    checkServerIdentity:(_name,remote)=>remote.raw.equals(cert.raw)?undefined:Error('certificate')});
  const timer=setTimeout(()=>socket.destroy(new Failure('network')),7000);
  let buffer=Buffer.alloc(0),sent=false;
  try{
    for await(const chunk of socket){
      buffer=Buffer.concat([buffer,chunk]);if(buffer.length>32772)throw new Failure('invalid');
      if(buffer.length<4)continue;
      const size=buffer.readUInt32BE();
      if(size<2||size>32768||buffer.length>size+4)throw new Failure('invalid');
      if(buffer.length<size+4)continue;
      const data:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(4)));
      if(sent)return data;
      if(!socket.authorized||!record(data)||!exact(data,['nonce'])||!secret(data.nonce))throw new Failure('invalid');
      const body=Buffer.from(JSON.stringify({v:1,nonce:data.nonce,...payload})),length=Buffer.alloc(4);
      length.writeUInt32BE(body.length);socket.write(Buffer.concat([length,body]));buffer=Buffer.alloc(0);sent=true;
    }
    throw new Failure('network');
  }finally{clearTimeout(timer);socket.destroy();}
}
export async function manage(req:Management):Promise<Devices|Reply>{
  const all=peers();
  if(req.op==='pair'){
    if(all.length>=8)return {ok:false,error:'limit'};
    if(all.some(p=>p.cert===req.offer.cert))return {ok:false,error:'duplicate'};
    const result=await exchange(req.offer,{op:'pair',challenge:req.offer.challenge});
    if(!record(result)||!exact(result,['id','token'])||!uuid(result.id)||!secret(result.token))return {ok:false,error:'unavailable'};
    all.push({id:result.id,token:result.token,ip:req.offer.ip,cert:req.offer.cert});save(all);
  }else if(req.op==='forget'){
    const index=all.findIndex(p=>p.id===req.id);
    if(index>=0){all.splice(index,1);save(all);}
  }
  return {ok:true,devices:all.map(p=>p.id)};
}
export async function forward(req:Request):Promise<Reply>{
  const peer=peers().find(p=>p.id===req.target);
  if(!peer)return {ok:false,error:'unavailable'};
  const data=await exchange(peer,{op:'job',id:peer.id,token:peer.token,request:req});
  return reply(data)?data:{ok:false,error:'invalid'};
}
