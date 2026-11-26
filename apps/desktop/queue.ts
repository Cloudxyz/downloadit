import { mkdirSync,readFileSync,writeFileSync,renameSync,unlinkSync,lstatSync,realpathSync,existsSync,statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join,resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { record,exact } from '../../packages/security/fields.js';
import { job,type Job,type Reply } from '../../packages/protocol/results.js';
import type { Request } from '../../packages/protocol/messages.js';
import { retrieve } from './media.js';
import { Failure } from './network.js';

type Entry={item:Job; attempts:number};
function directory(parent:string,name:string):string{
  const path=join(parent,name);
  mkdirSync(path,{recursive:true,mode:0o700});
  if(lstatSync(path).isSymbolicLink()||realpathSync.native(path).toLowerCase()!==resolve(path).toLowerCase())throw new Failure('storage');
  return path;
}
export class Queue {
  private root=directory(process.env.LOCALAPPDATA ?? (()=>{throw Error();})(),'DownloadIT');
  private output=directory(directory(homedir(),'Downloads'),'DownloadIT');
  private state=join(this.root,'queue.json');
  private entries:Entry[]=[];
  private active:AbortController|undefined;
  constructor(){
    if(existsSync(this.state)){
      const s=lstatSync(this.state);if(!s.isFile()||s.size>131072)throw new Failure('storage');
      const data:unknown=JSON.parse(readFileSync(this.state,'utf8'));
      if(!Array.isArray(data)||data.length>64)throw new Failure('storage');
      for(const e of data){
        if(!record(e)||!exact(e,['item','attempts'])||!job(e.item)||typeof e.attempts!=='number'||!Number.isInteger(e.attempts)||e.attempts<1||e.attempts>3)throw new Failure('storage');
        const item=e.item;
        if(item.state==='running'){
          const final=join(this.output,item.id+'-'+item.job+'.mp4');
          if(existsSync(final)&&lstatSync(final).isFile()&&statSync(final).size>0){item.state='done';item.progress=100;item.error=null;}
          else{item.state='failed';item.error='interrupted';}
          const part=join(this.output,item.job+'.part');if(existsSync(part))unlinkSync(part);
        }
        this.entries.push({item,attempts:e.attempts});
      }
      this.save();
    }
    this.next();
  }
  private save(){
    const temp=join(this.root,randomUUID()+'.tmp');
    writeFileSync(temp,JSON.stringify(this.entries),{flag:'wx',flush:true,mode:0o600});
    try{renameSync(temp,this.state);}finally{if(existsSync(temp))unlinkSync(temp);}
  }
  private next(){
    if(this.active)return;
    const entry=this.entries.find(e=>e.item.state==='queued');if(!entry)return;
    const item=entry.item,controller=new AbortController();this.active=controller;
    item.state='running';this.save();
    const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(10*60*1000)]);
    void retrieve(item,this.output,signal,p=>{item.progress=p;}).then(()=>{
      item.state='done';item.progress=100;item.error=null;
    },(err:unknown)=>{
      item.state=controller.signal.aborted?'cancelled':'failed';
      item.error=controller.signal.aborted?null:(err instanceof Failure?err.code:'network');
    }).finally(()=>{this.save();this.active=undefined;this.next();});
  }
  handle(req:Request):Reply{
    if(req.target!=='desktop')return {ok:false,error:'unavailable'};
    if(req.op==='submit'){
      if(req.format!=='mp4')return {ok:false,error:'unsupported'};
      if(this.entries.some(({item})=>item.id===req.id&&item.format===req.format&&item.quality===req.quality))return {ok:false,error:'duplicate'};
      if(this.entries.length>=64)return {ok:false,error:'limit'};
      this.entries.push({attempts:1,item:{id:req.id,job:randomUUID(),format:req.format,quality:req.quality,state:'queued',progress:0,error:null}});
    }else if(req.op==='clear'){
      this.entries=this.entries.filter(e=>e.item.state==='queued'||e.item.state==='running');
    }else if(req.op==='cancel'||req.op==='retry'){
      const entry=this.entries.find(e=>e.item.job===req.job);if(!entry)return {ok:false,error:'invalid'};
      if(req.op==='retry'){
        if(!['cancelled','failed'].includes(entry.item.state)||entry.attempts>=3)return {ok:false,error:'limit'};
        entry.attempts++;entry.item.state='queued';entry.item.progress=0;entry.item.error=null;
      }else if(entry.item.state==='running'){this.active?.abort();}
      else if(entry.item.state==='queued')entry.item.state='cancelled';
      else return {ok:false,error:'invalid'};
    }
    if(req.op!=='list'){this.save();this.next();}
    return {ok:true,jobs:this.entries.map(e=>e.item)};
  }
}
