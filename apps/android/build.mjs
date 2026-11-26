import {spawnSync} from 'node:child_process';
import {join,delimiter} from 'node:path';
import {existsSync} from 'node:fs';
await import('../../packages/core/build-audio.mjs');
const win=process.platform==='win32';
const executable=process.env.JAVA_HOME?join(process.env.JAVA_HOME,'bin',win?'java.exe':'java'):
  process.env.PATH.split(delimiter).map(dir=>join(dir,win?'java.exe':'java')).find(existsSync);
if(!executable) throw Error('Set JAVA_HOME to JDK 17.');
const result=spawnSync(executable,['-jar','gradle/wrapper/gradle-wrapper.jar',':app:assembleDebug','--max-workers=2','--console=plain'],{stdio:'inherit',shell:false});
process.exitCode=result.status??1;
