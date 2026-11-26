var encodedAudio, audioOffset=0;
function audioChunk(){
  const part=encodedAudio.subarray(audioOffset,audioOffset+32768);
  audioOffset+=part.length;
  return Array.from(part,n=>n.toString(16).padStart(2,'0')).join('');
}
(async()=>{
  const take=async name=>new Uint8Array(await android.consumeNamedDataAsArrayBuffer(name));
  const entropy=await take('entropy');
  let used=0;
  globalThis.crypto ??= {getRandomValues(view){
    if(used+view.byteLength>entropy.length)throw Error('entropy exhausted');
    new Uint8Array(view.buffer,view.byteOffset,view.byteLength).set(entropy.subarray(used,used+view.byteLength));
    used+=view.byteLength;return view;
  }};
  const compiled=await WebAssembly.compile(await take('wasm'));
  const av=await LibAVFactory({instantiateWasm:(imports,ready)=>ready(new WebAssembly.Instance(compiled,imports))});
  encodedAudio=await DownloadAudio.convert(av,await take('media'),JSON.parse(new TextDecoder().decode(await take('info'))));
  return String(encodedAudio.length);
})()
