import decode from 'qr/decode.js';
import {offer,type Offer} from '../../packages/protocol/peers.js';

export async function scan(video:HTMLVideoElement,signal:AbortSignal):Promise<Offer>{
  const stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:1280},height:{ideal:720}},audio:false});
  try{
    signal.throwIfAborted();
    video.srcObject=stream;video.muted=true;await video.play();
    const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error();
    while(!signal.aborted){
      const scale=Math.min(1,1280/video.videoWidth);
      canvas.width=Math.round(video.videoWidth*scale);canvas.height=Math.round(video.videoHeight*scale);
      ctx.drawImage(video,0,0,canvas.width,canvas.height);
      try{
        const raw=decode(ctx.getImageData(0,0,canvas.width,canvas.height));
        if(raw.length<3072){const data:unknown=JSON.parse(raw);if(offer(data))return data;}
      }catch{/* No valid pairing QR in this frame. */}
      await new Promise(resolve=>setTimeout(resolve,240));
    }
    throw Error();
  }finally{for(const track of stream.getTracks())track.stop();video.srcObject=null;}
}
