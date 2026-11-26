import { open, link, unlink, statfs, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { record } from '../../packages/security/fields.js';
import { resource,Failure } from './network.js';
import type { Job } from '../../packages/protocol/results.js';
import { encode } from './encode.js';
import { extractedUrls } from './extractor.js';
import { attachArtwork } from '../../packages/core/artwork.js';
import { existsSync } from 'node:fs';
import { audioSeconds } from '../../packages/core/limits.js';

function player(html:string):unknown {
  const marker=/\bvar ytInitialPlayerResponse\s*=\s*(?=\{)/.exec(html);
  if(!marker)throw new Failure('unsupported');
  const start=marker.index+marker[0].length;
  let quoted=false,depth=0;
  for(let i=start;i<html.length;i++){
    const c=html[i];
    if(quoted && c==='\\'){i++;continue;}
    if(c==='"')quoted=!quoted;
    if(!quoted && c==='{')depth++;
    if(!quoted && c==='}' && --depth===0)return JSON.parse(html.slice(start,i+1)) as unknown;
  }
  throw new Failure('unsupported');
}
function stream(data:unknown,item:Job,maxSeconds:number,approved?:Set<string>){
  if(!record(data)||!record(data.playabilityStatus)||data.playabilityStatus.status!=='OK'||
    !record(data.videoDetails)||data.videoDetails.videoId!==item.id||data.videoDetails.isPrivate!==false||
    data.videoDetails.isLiveContent===true||!record(data.streamingData))throw new Failure('unsupported');
  const duration=Number(data.videoDetails.lengthSeconds);
  if(!Number.isSafeInteger(duration)||duration<1||duration>maxSeconds)throw new Failure('limit');
  if(item.format==='mp3'){
    const candidates=data.streamingData.adaptiveFormats;
    if(!Array.isArray(candidates))throw new Failure('unsupported');
    const audio=candidates.filter(record).filter(f=>f.mimeType==='audio/webm; codecs="opus"'&&typeof f.url==='string'&&(!approved||approved.has(f.url))&&
      !f.drmFamilies&&!f.licenseInfos&&!f.signatureCipher&&!f.cipher).sort((a,b)=>Number(b.bitrate)-Number(a.bitrate))[0];
    if(!audio||typeof audio.url!=='string')throw new Failure('unsupported');
    return {url:audio.url,title:String(data.videoDetails.title??item.id).slice(0,160),artist:String(data.videoDetails.author??'').slice(0,160)};
  }
  if(!Array.isArray(data.streamingData.formats))throw new Failure('unsupported');
  const formats=data.streamingData.formats.filter(record).filter(f=>typeof f.url==='string'&&(!approved||approved.has(f.url))&&!f.drmFamilies&&!f.licenseInfos&&
    !f.signatureCipher&&!f.cipher&&typeof f.mimeType==='string'&&/^video\/mp4; codecs="avc1[\w.]+,\s*mp4a[\w.]+"$/.test(f.mimeType)&&
    typeof f.height==='number'&&f.height>0&&f.height<=item.quality);
  const best=formats.sort((a,b)=>Number(b.height)-Number(a.height))[0];
  if(!best||typeof best.url!=='string')throw new Failure('unsupported');
  return {url:best.url,title:String(data.videoDetails.title??item.id).slice(0,160),artist:String(data.videoDetails.author??'').slice(0,160)};
}
export async function retrieve(item:Job,dir:string,signal:AbortSignal,progress:(p:number)=>void,artwork:boolean,name:(title:string)=>string){
  const audio=item.format==='mp3';
  const extended=existsSync(new URL('./extended-limits',import.meta.url));
  const maxSeconds=audio?audioSeconds(item.quality,extended):(extended?7200:3600);
  const maxBytes=(audio?16:(extended?512:256))*1024*1024;
  const page=await resource('https://www.youtube.com/watch?v='+item.id,'watch',signal);
  const chunks:Buffer[]=[];let size=0;
  for await(const chunk of page){size+=chunk.length;if(size>4*1024*1024)throw new Failure('limit');chunks.push(chunk);}
  const html=Buffer.concat(chunks),data=player(html.toString('utf8'));
  const selected=stream(data,item,maxSeconds,await extractedUrls(item.id,html,signal));
  const destination=join(dir,name(selected.title));
  const media=await resource(selected.url,'media',signal);
  const part=join(dir,item.job+'.part');
  let created=false;
  try{
    const length=Number(media.headers['content-length']);
    if(length>maxBytes)throw new Failure('limit');
    if(!Number.isSafeInteger(length)||length<12||media.headers['content-type']?.split(';')[0]!== (audio?'audio/webm':'video/mp4'))throw new Failure('unsupported');
    const disk=await statfs(dir);
    if(disk.bavail*disk.bsize<length+(audio?72:32)*1024*1024)throw new Failure('storage');
    const file=await open(part,'wx',0o600);
    created=true;
    try{
      let received=0;
      for await(const chunk of media){
        signal.throwIfAborted();
        received+=chunk.length;if(received>length)throw new Failure('limit');
        await file.writeFile(chunk);progress(Math.min(99,Math.floor((audio?75:100)*received/length)));
      }
      if(received!==length)throw new Failure('network');
      await file.sync();
    }finally{await file.close();}
    if(audio){
      let result:Uint8Array=await encode(await readFile(part),{quality:item.quality,title:selected.title,artist:selected.artist,extended},signal);
      if(artwork){
        const cover=await resource('https://i.ytimg.com/vi/'+item.id+'/hqdefault.jpg','cover',signal);
        try{
          if(cover.headers['content-type']?.split(';')[0]!=='image/jpeg')throw new Failure('unsupported');
          const pieces:Buffer[]=[];let count=0;
          for await(const part of cover){count+=part.length;if(count>262144)throw new Failure('limit');pieces.push(part);}
          result=attachArtwork(result,Buffer.concat(pieces));
        }finally{cover.destroy();}
      }
      const converted=join(dir,item.job+'.encoded.part');
      const output=await open(converted,'wx',0o600);
      try{
        try{await output.writeFile(result);await output.sync();}finally{await output.close();}
        signal.throwIfAborted();
        await link(converted,destination);
      }finally{await unlink(converted);}
      return;
    }
    const header=await open(part,'r');
    try{const data=Buffer.alloc(12);await header.read(data,0,12,0);if(data.toString('ascii',4,8)!=='ftyp')throw new Failure('unsupported');}finally{await header.close();}
    signal.throwIfAborted();
    // A generated job suffix allows safe crash reconciliation. link fails if the destination exists.
    await link(part,destination);
  }finally{media.destroy();if(created)await unlink(part).catch(()=>{});}
}
