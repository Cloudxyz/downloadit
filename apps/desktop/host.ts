import { request } from '../../packages/protocol/messages.js';
import type { Reply } from '../../packages/protocol/results.js';
import { Queue } from './queue.js';

const origin='chrome-extension://gnjjgfaigfdmkfmjmjnokalgifpjfccd/';
async function main(){
  if(process.platform!=='win32'||process.argv[2]!==origin)return;
  const jobs=new Queue();
  let bytes=Buffer.alloc(0);
  for await(const chunk of process.stdin){
    bytes=Buffer.concat([bytes,chunk]);
    while(bytes.length>=4){
      const size=bytes.readUInt32LE();if(size<2||size>4096)return;
      if(bytes.length<4+size)break;
      let response:Reply={ok:false,error:'invalid'};
      try{
        const value:unknown=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes.subarray(4,4+size)));
        if(request(value))response=jobs.handle(value);
      }catch{process.exitCode=1;return;}
      bytes=bytes.subarray(4+size);
      const body=Buffer.from(JSON.stringify(response)),header=Buffer.alloc(4);header.writeUInt32LE(body.length);
      await new Promise<void>((done,fail)=>process.stdout.write(Buffer.concat([header,body]),err=>err?fail(err):done()));
    }
  }
}
main().then(()=>process.exit(process.exitCode??0),()=>process.exit(1));
