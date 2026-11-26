import {build} from 'esbuild';
await build({entryPoints:['apps/desktop/host.ts'],outfile:'dist/desktop/host.mjs',platform:'node',target:'node24',bundle:true,format:'esm'});
