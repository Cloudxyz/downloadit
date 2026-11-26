import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {build} from 'esbuild';

const root=fileURLToPath(new URL('../../',import.meta.url));
const prefix=join(root,'node_modules/@libav.js/variant-obsolete/dist/libav-6.11.9.0.2-obsolete.wasm.');
const out=join(root,'dist/codec');
await mkdir(out,{recursive:true});
async function checked(extension,digest){
  const data=await readFile(prefix+extension);
  if(createHash('sha256').update(data).digest('hex')!==digest)throw Error('Codec integrity mismatch');
  return data;
}
const factory=await checked('js','6d1104c81c2fac6f3559bf56a0ab4f44f7889dcecb24873e5ff0e0e9a76d397c');
const wasm=await checked('wasm','c8215729ecb3c7d98a15b3fc911f5c17c805b9dbbfd75a37b71de5e9f55d64df');
// Narrow the single declared memory maximum from 32768 to 2048 pages.
// Retain the three-byte unsigned LEB encoding to preserve section offsets.
let offset=8,limited=false;
while(offset<wasm.length){
  const section=wasm[offset++];let size=0,shift=0,byte;
  do{byte=wasm[offset++];size+=(byte&127)*2**shift;shift+=7;}while(byte&128);
  if(section===5){
    if(wasm.subarray(offset,offset+size).toString('hex')!=='01018003808002')throw Error('Unexpected memory declaration');
    wasm.set([0x80,0x90,0x00],offset+4);limited=true;
  }
  offset+=size;
}
if(!limited||!WebAssembly.validate(wasm))throw Error('Invalid bounded codec');
await writeFile(join(out,'factory.cjs'),factory);
await writeFile(join(out,'av.wasm'),wasm);
await build({entryPoints:[join(root,'packages/core/audio.ts')],outfile:join(out,'convert.js'),bundle:true,platform:'neutral',format:'iife',globalName:'DownloadAudio',footer:{js:"if(typeof module==='object')module.exports=DownloadAudio;"}});
