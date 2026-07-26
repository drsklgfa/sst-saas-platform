import { readdirSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let ts;
try {
  ts = require('typescript');
} catch {
  ts = require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript/lib/typescript.js');
}
const root = process.cwd();
const files=[];
function walk(dir){for(const ent of readdirSync(dir,{withFileTypes:true})){if(['node_modules','.next','.git'].includes(ent.name))continue;const p=path.join(dir,ent.name);if(ent.isDirectory())walk(p);else files.push(p)}}
walk(root);
let errors=0;
for(const file of files.filter(f=>/\.(ts|tsx)$/.test(f)&&!f.endsWith('.d.ts'))){
  const src=readFileSync(file,'utf8');
  const output=ts.transpileModule(src,{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.Preserve,isolatedModules:true}});
  for(const diag of output.diagnostics??[]){if(diag.category===ts.DiagnosticCategory.Error){errors++;console.error(`${path.relative(root,file)} TS${diag.code}: ${ts.flattenDiagnosticMessageText(diag.messageText,' ')}`)}}
  for(const match of src.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)){
    const base=path.resolve(path.dirname(file),match[1]);
    const candidates=[base,`${base}.ts`,`${base}.tsx`,`${base}.js`,path.join(base,'index.ts'),path.join(base,'index.tsx')];
    if(!candidates.some(existsSync)){errors++;console.error(`${path.relative(root,file)}: import relativo inexistente ${match[1]}`)}
  }
}
for(const file of files.filter(f=>f.endsWith('.json'))){try{JSON.parse(readFileSync(file,'utf8'))}catch(e){errors++;console.error(`${path.relative(root,file)}: JSON inválido: ${e.message}`)}}
console.log(`Validados ${files.length} arquivos; erros: ${errors}`);
process.exit(errors?1:0);
