import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const schema = readFileSync("prisma/schema.prisma", "utf8");
const dockerfile = readFileSync("Dockerfile", "utf8");

test("Prisma Client inclui engine do runtime Debian OpenSSL 3", () => {
  assert.match(schema, /binaryTargets\s*=\s*\["native",\s*"debian-openssl-3\.0\.x"\]/);
});

test("estágios Docker possuem OpenSSL antes de gerar e executar o Prisma Client", () => {
  const installs = dockerfile.match(/apt-get install[^\n]*(?:\\\n[^\n]*)*/g) ?? [];
  assert.ok(installs.length >= 3, "deps, builder e runner devem instalar pacotes do sistema");
  assert.ok(installs.every((line) => line.includes("openssl")), "todos os estágios devem incluir openssl");
  assert.match(dockerfile, /test -f node_modules\/.prisma\/client\/libquery_engine-debian-openssl-3\.0\.x\.so\.node/);
});
