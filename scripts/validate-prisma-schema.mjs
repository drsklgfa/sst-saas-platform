import { readFileSync } from 'node:fs';

const source = readFileSync('prisma/schema.prisma', 'utf8');
let errors = 0;
const fail = (message) => { errors += 1; console.error(`schema.prisma: ${message}`); };

const blocks = [];
const header = /\b(model|enum)\s+(\w+)\s*\{/g;
for (const match of source.matchAll(header)) {
  const open = source.indexOf('{', match.index);
  let depth = 0;
  let close = -1;
  for (let index = open; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) { close = index; break; }
  }
  if (close < 0) { fail(`bloco ${match[2]} sem fechamento`); continue; }
  blocks.push({ kind: match[1], name: match[2], body: source.slice(open + 1, close) });
}
const names = new Map();
for (const block of blocks) {
  if (names.has(block.name)) fail(`definição duplicada: ${block.name}`);
  names.set(block.name, block);
}
const models = new Map(blocks.filter((b) => b.kind === 'model').map((b) => [b.name, b]));
const enums = new Map();
for (const block of blocks.filter((candidate) => candidate.kind === 'enum')) {
  const values = block.body.split(/\s+/).filter(Boolean);
  if (new Set(values).size !== values.length) fail(`${block.name}: valor duplicado no enum`);
  enums.set(block.name, new Set(values));
}
const scalars = new Set(['String','Int','BigInt','Float','Decimal','Boolean','DateTime','Json','Bytes']);

const modelFields = new Map();
for (const [name, block] of models) {
  const fields = new Map();
  const directives = [];
  for (const raw of block.body.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('//')) continue;
    if (line.startsWith('@@')) { directives.push(line); continue; }
    const match = line.match(/^(\w+)\s+([\w]+)(\[\])?(\?)?\s*(.*)$/);
    if (!match) { fail(`${name}: linha não reconhecida: ${line}`); continue; }
    const [, fieldName, baseType, list, optional, attrs] = match;
    if (fields.has(fieldName)) fail(`${name}: campo duplicado ${fieldName}`);
    fields.set(fieldName, { baseType, list: Boolean(list), optional: Boolean(optional), attrs, line });
    if (!scalars.has(baseType) && !models.has(baseType) && !enums.has(baseType)) fail(`${name}.${fieldName}: tipo desconhecido ${baseType}`);
    const def = attrs.match(/@default\((\w+)\)/);
    if (def && enums.has(baseType) && !enums.get(baseType).has(def[1])) fail(`${name}.${fieldName}: valor padrão ${def[1]} não pertence ao enum ${baseType}`);
  }
  modelFields.set(name, { fields, directives });
}

for (const [name, data] of modelFields) {
  for (const [fieldName, field] of data.fields) {
    if (!field.attrs.includes('@relation')) continue;
    if (!models.has(field.baseType)) fail(`${name}.${fieldName}: @relation deve apontar para model, recebeu ${field.baseType}`);
    const fieldsArg = field.attrs.match(/fields\s*:\s*\[([^\]]*)\]/)?.[1]?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
    const refsArg = field.attrs.match(/references\s*:\s*\[([^\]]*)\]/)?.[1]?.split(',').map((v) => v.trim()).filter(Boolean) ?? [];
    if (fieldsArg.length !== refsArg.length) fail(`${name}.${fieldName}: fields/references com tamanhos diferentes`);
    for (const local of fieldsArg) if (!data.fields.has(local)) fail(`${name}.${fieldName}: campo local ${local} não existe`);
    const targetFields = modelFields.get(field.baseType)?.fields;
    for (const ref of refsArg) if (!targetFields?.has(ref)) fail(`${name}.${fieldName}: referência ${field.baseType}.${ref} não existe`);
  }
  for (const directive of data.directives) {
    const list = directive.match(/@@(?:id|unique|index)\s*\(\s*\[([^\]]+)\]/)?.[1];
    if (!list) continue;
    for (const field of list.split(',').map((v) => v.trim().split(/\s+/)[0]).filter(Boolean)) {
      if (!data.fields.has(field)) fail(`${name}: diretiva usa campo inexistente ${field}`);
    }
  }
}

for (const [name, data] of modelFields) {
  for (const [fieldName, field] of data.fields) {
    if (!models.has(field.baseType)) continue;
    const inverse = modelFields.get(field.baseType)?.fields;
    const hasInverse = [...(inverse?.values() ?? [])].some((candidate) => candidate.baseType === name);
    if (!hasInverse) fail(`${name}.${fieldName}: relação sem campo inverso em ${field.baseType}`);
  }
}

if (!models.has('Tenant') || !models.has('Company') || !models.has('Document')) fail('modelos centrais ausentes');
console.log(`Prisma: ${models.size} models, ${enums.size} enums; erros: ${errors}`);
process.exit(errors ? 1 : 0);
