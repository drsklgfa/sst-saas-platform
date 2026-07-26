import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync("Dockerfile", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

test("runtime Docker inclui scripts operacionais de seed", () => {
  assert.match(dockerfile, /COPY --from=builder \/app\/scripts \.\/scripts/);
  assert.match(dockerfile, /test -f \.\/scripts\/preflight-seed\.mjs/);
});

test("comandos de seed apontam para arquivos presentes no runtime", () => {
  assert.equal(packageJson.scripts["preflight:seed"], "node scripts/preflight-seed.mjs");
  assert.equal(packageJson.scripts["db:seed"], "tsx prisma/seed.ts");
  assert.match(dockerfile, /test -f \.\/prisma\/seed\.ts/);
});
