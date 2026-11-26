import { build } from 'esbuild';
import { copyFile, mkdir } from 'node:fs/promises';
const outdir = 'dist/extension';
await mkdir(outdir,{recursive:true});
await build({entryPoints:['content','background','panel'].map(name => 'apps/extension/'+name+'.ts'),bundle:true,outdir,platform:'browser',target:'chrome116',format:'iife',legalComments:'inline'});
for (const file of ['manifest.json','panel.html','panel.css']) await copyFile('apps/extension/'+file,outdir+'/'+file);
await copyFile('apps/extension/node_modules/qr/LICENSE-MIT',outdir+'/QR-LICENSE.txt');
