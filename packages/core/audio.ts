import type LibAV from '@libav.js/variant-obsolete';
import {audioSeconds} from './limits.js';
export {attachArtwork} from './artwork.js';

export type AudioInfo={quality:number;title:string;artist:string;extended:boolean};
export async function convert(av:LibAV.LibAV,bytes:Uint8Array,info:AudioInfo):Promise<Uint8Array>{
  if(bytes.length>16*1024*1024||![128,192,320].includes(info.quality))throw Error('limit');
  await av.av_log_set_level(-8);
  await av.writeFile('source.webm',bytes);
  const [input,streams]=await av.ff_init_demuxer_file('source.webm','matroska');
  const track=streams[0];
  if(streams.length!==1||!track||track.codec_type!==1||await av.avcodec_get_name(track.codec_id)!=='opus')throw Error('unsupported');
  const [,decoder,dp,df]=await av.ff_init_decoder(track.codec_id,{codecpar:track.codecpar,time_base:[track.time_base_num,track.time_base_den]});
  const channels=await av.AVCodecParameters_channels(track.codecpar);
  if(channels!==1&&channels!==2)throw Error('unsupported');
  const layout=channels===1?4:3,rate=48000;
  const maxSamples=audioSeconds(info.quality,info.extended===true)*rate;
  const [,encoder,ef,ep,frameSize]=await av.ff_init_encoder('libmp3lame',{ctx:{sample_rate:rate,sample_fmt:6,
    channel_layout:layout,bit_rate:info.quality*1000},time_base:[1,rate]});
  const [output,,io]=await av.ff_init_muxer({filename:'output.mp3',format_name:'mp3',open:true},[[encoder,1,rate]]);
  let metadata=0;
  for(const [key,value] of [['title',info.title],['artist',info.artist]] as const){
    metadata=await av.av_dict_set_js(metadata,key,value.slice(0,160),0);
  }
  await av.AVFormatContext_metadata_s(output,metadata);
  if(await av.avformat_write_header(output,0)<0)throw Error('unsupported');
  let filter:[number,number,number]|undefined,samples=0;
  while(true){
    const [result,groups]=await av.ff_read_frame_multi(input,dp,{limit:4096});
    const end=result===-541478725;
    if(!end&&result!==-6&&result!==-11&&result!==0)throw Error('unsupported');
    const frames=await av.ff_decode_multi(decoder,dp,df,groups[track.index]??[],end);
    for(const f of frames){
      if(f.sample_rate!==rate||!f.nb_samples)throw Error('unsupported');
      samples+=f.nb_samples;if(samples>maxSamples)throw Error('limit');
    }
    const first=frames[0];
    if(!filter&&first)filter=await av.ff_init_filter_graph('anull',{sample_rate:rate,sample_fmt:first.format,
      channel_layout:layout,time_base:[track.time_base_num,track.time_base_den]},
      {sample_rate:rate,sample_fmt:6,channel_layout:layout,frame_size:frameSize});
    if(filter){
      const converted=await av.ff_filter_multi(filter[1],filter[2],df,frames,end);
      const encoded=await av.ff_encode_multi(encoder,ef,ep,converted,end);
      await av.ff_write_multi(output,ep,encoded);
    }
    if(end)break;
  }
  if(!samples||await av.av_write_trailer(output)<0)throw Error('unsupported');
  await av.ff_free_muxer(output,io);
  const result=await av.readFile('output.mp3');
  if(result.length<128||result.length>37*1024*1024)throw Error('limit');
  return result;
}
