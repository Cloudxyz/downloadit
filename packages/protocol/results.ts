import { quality, videoId, type Format } from '../core/video.js';
import { exact,record } from '../security/fields.js';
import { uuid } from './messages.js';

export const states = ['queued','running','done','failed','cancelled'] as const;
export const errors = ['unavailable','unsupported','network','storage','interrupted','duplicate','limit','busy','invalid'] as const;
export type Fault = typeof errors[number];
export type Job = {job:string; id:string; format:Format; quality:number; state:typeof states[number]; progress:number; error:Fault|null};
export type Reply = {ok:true; jobs:Job[]} | {ok:false; error:Fault};
export function job(value:unknown): value is Job {
  return record(value) && exact(value,['job','id','format','quality','state','progress','error']) &&
    uuid(value.job) && videoId(value.id) && quality(value.format,value.quality) &&
    states.some(s=>s===value.state) && Number.isInteger(value.progress) && typeof value.progress==='number' &&
    value.progress>=0 && value.progress<=100 && (value.error===null || errors.some(e=>e===value.error));
}
export function reply(value:unknown): value is Reply {
  if (!record(value)) return false;
  return value.ok===true ? exact(value,['ok','jobs']) && Array.isArray(value.jobs) && value.jobs.length<=64 && value.jobs.every(job) :
    value.ok===false && exact(value,['ok','error']) && errors.some(e=>e===value.error);
}
