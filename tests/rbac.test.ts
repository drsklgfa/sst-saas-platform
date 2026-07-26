import test from 'node:test';
import assert from 'node:assert/strict';
import { companyPermissionsFor, hasCompanyPermission, hasTenantPermission, tenantPermissionsFor } from '../src/lib/rbac.ts';

test('OWNER e ADMIN possuem todas as permissões internas', () => {
  const owner = tenantPermissionsFor('OWNER');
  const admin = tenantPermissionsFor('ADMIN');
  assert.deepEqual(owner, admin);
  assert.equal(hasTenantPermission('OWNER', 'backup.manage'), true);
  assert.equal(hasTenantPermission('ADMIN', 'settings.manage'), true);
});

test('READER não consegue alterar dados nem gerar backups', () => {
  assert.equal(hasTenantPermission('READER', 'company.read'), true);
  assert.equal(hasTenantPermission('READER', 'company.write'), false);
  assert.equal(hasTenantPermission('READER', 'backup.manage'), false);
  assert.equal(hasTenantPermission('READER', 'document.issue'), false);
});

test('permissões adicionais explícitas são respeitadas', () => {
  assert.equal(hasTenantPermission('READER', 'message.manage', ['message.manage']), true);
  assert.equal(hasCompanyPermission('READER', 'message.reply', ['message.reply']), true);
});

test('RH_ADMIN possui todas as permissões do portal', () => {
  const permissions = companyPermissionsFor('RH_ADMIN');
  assert.equal(permissions.includes('document.read'), true);
  assert.equal(permissions.includes('action.update'), true);
  assert.equal(permissions.includes('access.manage'), true);
});

test('perfis restritos do portal seguem o menor privilégio', () => {
  assert.equal(hasCompanyPermission('READER', 'document.read'), true);
  assert.equal(hasCompanyPermission('READER', 'action.read'), false);
  assert.equal(hasCompanyPermission('ACTION_OWNER', 'action.update'), true);
  assert.equal(hasCompanyPermission('ACTION_OWNER', 'document.read'), false);
  assert.equal(hasCompanyPermission('AUDITOR', 'evidence.read'), true);
  assert.equal(hasCompanyPermission('AUDITOR', 'action.update'), false);
});
