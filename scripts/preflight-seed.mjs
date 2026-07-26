const required = [
  'SEED_TENANT_NAME',
  'SEED_TENANT_SLUG',
  'SEED_ADMIN_NAME',
  'SEED_ADMIN_EMAIL',
  'SEED_ADMIN_PASSWORD',
];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Variáveis do seed ausentes: ${missing.join(', ')}`);
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(process.env.SEED_TENANT_SLUG)) {
  throw new Error('SEED_TENANT_SLUG deve usar apenas letras minúsculas, números e hífens.');
}
if (process.env.SEED_ADMIN_PASSWORD.length < 12) {
  throw new Error('SEED_ADMIN_PASSWORD deve ter ao menos 12 caracteres.');
}
console.log('Preflight do seed concluído.');
