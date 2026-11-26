// 900 seconds at 320 kbps is 36 MB of audio before tags and container overhead.
export function audioSeconds(bitrate:number, extended:boolean):number {
  if (![128,192,320].includes(bitrate)) throw Error('invalid bitrate');
  return extended ? Math.floor(900*320/bitrate) : 900;
}
