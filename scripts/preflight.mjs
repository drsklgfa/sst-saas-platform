import { existsSync, readFileSync } from 'node:fs';

const required = ['DATABASE_URL', 'AUTH_SECRET', 'FILE_ENCRYPTION_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Variáveis ausentes: ${missing.join(', ')}`);
  process.exit(1);
}

if (process.env.AUTH_SECRET.length < 32) {
  throw new Error('AUTH_SECRET deve ter ao menos 32 caracteres.');
}
if (!/^[0-9a-fA-F]{64}$/.test(process.env.FILE_ENCRYPTION_KEY)) {
  throw new Error('FILE_ENCRYPTION_KEY deve conter exatamente 64 caracteres hexadecimais.');
}

const storageDriver = process.env.STORAGE_DRIVER ?? 'local';
if (!['local', 's3'].includes(storageDriver)) {
  throw new Error('STORAGE_DRIVER deve ser local ou s3.');
}
if (storageDriver === 's3') {
  const s3Required = ['S3_ENDPOINT', 'S3_REGION', 'S3_BUCKET', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];
  const s3Missing = s3Required.filter((key) => !process.env[key]);
  if (s3Missing.length) throw new Error(`Configuração S3 incompleta: ${s3Missing.join(', ')}`);
}

if ((process.env.AI_PROVIDER ?? 'disabled') === 'gemini' && !process.env.GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY é obrigatória quando AI_PROVIDER=gemini.');
}
if ((process.env.EMAIL_PROVIDER ?? 'disabled') === 'resend') {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) {
    throw new Error('RESEND_API_KEY e EMAIL_FROM são obrigatórios quando EMAIL_PROVIDER=resend.');
  }
}

if (!existsSync('prisma/schema.prisma')) throw new Error('prisma/schema.prisma ausente.');
JSON.parse(readFileSync('package.json', 'utf8'));
console.log('Preflight concluído.');
