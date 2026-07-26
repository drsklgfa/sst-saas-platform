import { readFileSync } from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");

test("schema Prisma mantém separação e espaçamento canônicos", () => {
  assert.doesNotMatch(schema, /}\n(?:enum|model|generator|datasource) /);
  assert.doesNotMatch(schema, /fields:\[/);
  assert.doesNotMatch(schema, /references:\[/);
  assert.doesNotMatch(schema, /onDelete:[A-Z]/);
  assert.doesNotMatch(schema, /@@(?:index|unique)\(\[[^\]]*,[^\s]/);
  assert.match(schema, /generator client \{[\s\S]*?\}\n\ndatasource db \{/);
});
