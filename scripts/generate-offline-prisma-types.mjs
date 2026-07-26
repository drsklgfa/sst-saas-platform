import { readFileSync, writeFileSync } from 'node:fs';

const schema = readFileSync('prisma/schema.prisma', 'utf8');
const enums = [...schema.matchAll(/enum\s+(\w+)\s*\{([^}]*)\}/gs)].map((match) => ({
  name: match[1],
  values: match[2]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//'))
    .map((line) => line.split(/\s+/)[0]),
}));
const models = [...schema.matchAll(/model\s+(\w+)\s*\{/g)].map((match) => match[1]);

const out = [];
out.push("declare module '@prisma/client' {");
out.push('  export namespace Prisma {');
out.push('    export type JsonPrimitive = string | number | boolean | null;');
out.push('    export type JsonObject = { [Key in string]?: JsonValue };');
out.push('    export interface JsonArray extends Array<JsonValue> {}');
out.push('    export type JsonValue = JsonPrimitive | JsonObject | JsonArray;');
out.push('    export type InputJsonObject = { readonly [Key in string]?: InputJsonValue | null };');
out.push('    export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}');
out.push('    export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown };');
out.push('    export const JsonNull: unique symbol;');
out.push('    export const DbNull: unique symbol;');
out.push('    export const AnyNull: unique symbol;');
out.push('    export type JsonNull = typeof JsonNull;');
out.push('    export type NullableJsonNullValueInput = typeof DbNull | typeof JsonNull;');
out.push('    export type TransactionClient = PrismaClient;');
out.push("    export type SortOrder = 'asc' | 'desc';");
out.push('    export class PrismaClientKnownRequestError extends Error { code: string; meta?: unknown }');
out.push('  }');
for (const item of enums) {
  out.push(`  export const ${item.name}: { ${item.values.map((value) => `readonly ${value}: '${value}'`).join('; ')} };`);
  out.push(`  export type ${item.name} = (typeof ${item.name})[keyof typeof ${item.name}];`);
}
for (const model of models) out.push(`  export interface ${model} { id: string; [key: string]: any }`);
out.push('  export class PrismaClient {');
out.push('    constructor(options?: any);');
for (const model of models) out.push(`    ${model[0].toLowerCase()}${model.slice(1)}: any;`);
out.push('    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;');
out.push('    $transaction<T extends readonly unknown[]>(items: T): Promise<T>;');
out.push('    $queryRaw<T = unknown>(query: TemplateStringsArray | any, ...values: any[]): Promise<T>;');
out.push('    $executeRaw(query: TemplateStringsArray | any, ...values: any[]): Promise<number>;');
out.push('    $disconnect(): Promise<void>;');
out.push('  }');
out.push('}');

writeFileSync('types/offline-prisma.d.ts', `${out.join('\n')}\n`);
console.log(`Tipagens Prisma offline: ${models.length} models e ${enums.length} enums.`);
