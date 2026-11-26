import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Failure} from './network.js';

export async function extractedUrls(id:string,html:Buffer,signal:AbortSignal):Promise<Set<string>|undefined>{
  const dir=fileURLToPath(new URL('./extractor/',import.meta.url));
  if(!existsSync(dir))return;
  const command=join(process.env.SystemRoot!,'System32','wsl.exe');
  const args=['--distribution','Ubuntu','--cd',dir,'--exec','/usr/bin/bwrap','--unshare-all','--unshare-user','--unshare-net',
    '--disable-userns','--cap-drop','ALL','--new-session','--die-with-parent','--clearenv','--setenv','PATH','/nonexistent',
    '--setenv','YTDLP_NO_PLUGINS','1','--ro-bind','/usr/lib','/usr/lib','--ro-bind-try','/usr/lib64','/usr/lib64',
    '--symlink','usr/lib','/lib','--symlink','usr/lib64','/lib64','--ro-bind','/usr/bin/python3','/usr/bin/python3',
    '--dev','/dev','--ro-bind','./yt-dlp.zip','/app/yt-dlp.zip','--ro-bind','./select.py','/app/select.py',
    '--chdir','/app','--remount-ro','/','--','/usr/bin/python3','-I','-B','-S','/app/select.py'];
  const lifetime=AbortSignal.any([signal,AbortSignal.timeout(25000)]);
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{shell:false,windowsHide:true,signal:lifetime,stdio:['pipe','pipe','ignore']});
    const chunks:Buffer[]=[];let total=0;
    child.stdout.on('data',(b:Buffer)=>{total+=b.length;if(total>262144)child.kill();else chunks.push(b);});
    child.once('error',()=>reject(new Failure('unsupported')));
    child.once('close',code=>{
      try{
        if(code!==0||total>262144)throw Error();
        const urls:unknown=JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if(!Array.isArray(urls)||urls.length>128||!urls.every(u=>typeof u==='string'&&u.length<=8192))throw Error();
        resolve(new Set(urls as string[]));
      }catch{reject(new Failure('unsupported'));}
    });
    child.stdin.on('error',()=>child.kill());
    child.stdin.write(JSON.stringify({id})+'\n');child.stdin.end(html);
  });
}
