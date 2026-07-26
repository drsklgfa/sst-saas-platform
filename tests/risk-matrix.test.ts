import test from 'node:test';import assert from 'node:assert/strict';import {calculateRisk,classifyRisk} from '../src/domain/engines/risk-matrix.ts';
test('classifica matriz de risco',()=>{assert.equal(classifyRisk(2),'VERY_LOW');assert.equal(classifyRisk(12),'HIGH');assert.equal(calculateRisk(5,5,1).level,'CRITICAL')});
test('rejeita escala inválida',()=>assert.throws(()=>calculateRisk(0,2),/entre 1 e 5/));
