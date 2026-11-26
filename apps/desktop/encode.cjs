'use strict';
// One bounded binary message on stdin. Media is never interpreted as JavaScript.
const fs=require('node:fs');
const path=require('node:path');
const factory=require('./factory.cjs');
const {convert}=require('./convert.js');
async function main(){
  let size=0;const chunks=[];
  for await(const part of process.stdin){size+=part.length;if(size>16*1024*1024+4096)throw Error();chunks.push(part);}
  const input=Buffer.concat(chunks),header=input.readUInt32BE();
  if(header<2||header>4092)throw Error();
  const info=JSON.parse(input.subarray(4,4+header).toString('utf8'));
  const moduleImage=new WebAssembly.Module(fs.readFileSync(path.join(__dirname,'av.wasm')));
  const av=await factory({instantiateWasm:(imports,ready)=>ready(new WebAssembly.Instance(moduleImage,imports))});
  const result=await convert(av,input.subarray(4+header),info);
  process.stdout.write(result);
}
main().catch(()=>{process.exitCode=1;});
