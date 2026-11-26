import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import type {AudioInfo} from '../../packages/core/audio.js';
import {Failure} from './network.js';

export function encode(data:Buffer,info:AudioInfo,signal:AbortSignal):Promise<Buffer>{
  const dir=fileURLToPath(new URL('./codec/',import.meta.url));
  const lifetime=AbortSignal.any([signal,AbortSignal.timeout(120000)]);
  lifetime.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,['--permission','--allow-fs-read='+dir,'--no-experimental-fetch','--disable-proto=throw',
      '--max-old-space-size=128','--wasm-max-mem-pages=2048',join(dir,'encode.cjs')],{cwd:dir,env:{SystemRoot:process.env.SystemRoot},
      shell:false,windowsHide:true,stdio:['pipe','pipe','ignore'],signal:lifetime});
    const chunks:Buffer[]=[];let size=0;
    child.once('error',()=>reject(new Failure('unsupported')));
    child.stdout.on('data',(part:Buffer)=>{size+=part.length;if(size>37*1024*1024){child.kill();return;}chunks.push(part);});
    child.once('close',code=>{
      if(code!==0||size<128||size>37*1024*1024){reject(new Failure('unsupported'));return;}
      const bytes=Buffer.concat(chunks);if(bytes.toString('ascii',0,3)!=='ID3'){reject(new Failure('unsupported'));return;}resolve(bytes);
    });
    child.stdin.on('error',()=>child.kill());
    const body=Buffer.from(JSON.stringify(info)),prefix=Buffer.alloc(4);prefix.writeUInt32BE(body.length);
    child.stdin.write(prefix);child.stdin.write(body);child.stdin.end(data);
  });
}
