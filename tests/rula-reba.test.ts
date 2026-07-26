import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateRula } from '../src/domain/engines/rula.ts';
import { calculateReba } from '../src/domain/engines/reba.ts';

test('RULA limita a pontuação e retorna ação', () => {
  const low = calculateRula({ upperArm: 1, lowerArm: 1, wrist: 1, wristTwist: 1, neck: 1, trunk: 1, legs: 1 });
  const high = calculateRula({ upperArm: 6, lowerArm: 3, wrist: 4, wristTwist: 2, neck: 6, trunk: 6, legs: 2, muscleUse: 1, forceLoad: 3 });
  assert.ok(low.score >= 1 && low.score <= 7);
  assert.equal(high.score, 7);
  assert.equal(high.action, 'MUDANÇAS IMEDIATAS');
});

test('REBA diferencia cenário simples e crítico', () => {
  const low = calculateReba({ trunk: 1, neck: 1, legs: 1, upperArm: 1, lowerArm: 1, wrist: 1, load: 0, coupling: 0, activity: 0 });
  const high = calculateReba({ trunk: 5, neck: 3, legs: 4, upperArm: 6, lowerArm: 2, wrist: 3, load: 3, coupling: 3, activity: 3 });
  assert.ok(high.score > low.score);
  assert.equal(high.level, 'MUITO ALTO');
});
