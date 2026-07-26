import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignAvailability, campaignStatusForCreation, generateParticipationCode, normalizeParticipationCode } from '../src/domain/campaigns.ts';

test('campanha respeita janela de abertura e encerramento', () => {
  const now = new Date('2026-07-22T15:00:00Z');
  assert.equal(campaignAvailability({ status: 'SCHEDULED', startsAt: new Date('2026-07-22T16:00:00Z'), now }), 'SCHEDULED');
  assert.equal(campaignAvailability({ status: 'SCHEDULED', startsAt: new Date('2026-07-22T14:00:00Z'), now }), 'OPEN');
  assert.equal(campaignAvailability({ status: 'ACTIVE', endsAt: new Date('2026-07-22T14:59:00Z'), now }), 'CLOSED');
  assert.equal(campaignAvailability({ status: 'PAUSED', now }), 'PAUSED');
});

test('status inicial distingue rascunho, agendamento e ativação', () => {
  const now = new Date('2026-07-22T15:00:00Z');
  assert.equal(campaignStatusForCreation({ requested: 'DRAFT', startsAt: null, now }), 'DRAFT');
  assert.equal(campaignStatusForCreation({ requested: 'ACTIVE', startsAt: new Date('2026-07-23T15:00:00Z'), now }), 'SCHEDULED');
  assert.equal(campaignStatusForCreation({ requested: 'ACTIVE', startsAt: null, now }), 'ACTIVE');
});

test('códigos de participação são legíveis e normalizados', () => {
  const code = generateParticipationCode(12);
  assert.match(code, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{12}$/);
  assert.equal(normalizeParticipationCode(' ab-cd 123 '), 'ABCD123');
});
