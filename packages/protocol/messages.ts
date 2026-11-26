import { quality, videoId, type Format } from '../core/video.js';
import { exact, record } from '../security/fields.js';

export type Request =
  | { v: 1; op: 'submit'; id: string; format: Format; quality: number; target: string; artwork?:boolean }
  | { v: 1; op: 'cancel' | 'retry'; job: string; target: string }
  | { v: 1; op: 'list' | 'clear'; target: string };

export const uuid = (v: unknown): v is string => typeof v === 'string' && v.length === 36 &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);

export function request(value: unknown): value is Request {
  if (!record(value) || value.v !== 1 || !(value.target === 'desktop' || uuid(value.target))) return false;
  const base = ['v','op','target'];
  switch (value.op) {
    case 'submit': {
      const keys=[...base,'id','format','quality'];
      if(Object.hasOwn(value,'artwork')){
        if(value.format!=='mp3'||typeof value.artwork!=='boolean')return false;
        keys.push('artwork');
      }
      return exact(value,keys)&&videoId(value.id)&&quality(value.format,value.quality);
    }
    case 'retry': case 'cancel': return exact(value,[...base,'job']) && uuid(value.job);
    case 'list': case 'clear': return exact(value,base);
    default: return false;
  }
}
