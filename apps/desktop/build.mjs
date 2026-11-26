import {build} from 'esbuild';
import '../../packages/core/build-audio.mjs';
import {cp,copyFile,writeFile} from 'node:fs/promises';
await build({entryPoints:['apps/desktop/host.ts'],outfile:'dist/desktop/host.mjs',platform:'node',target:'node24',bundle:true,format:'esm'});
await cp('dist/codec','dist/desktop/codec',{recursive:true});
await copyFile('apps/desktop/encode.cjs','dist/desktop/codec/encode.cjs');
await writeFile('dist/desktop/codec/package.json','{"type":"commonjs"}');
