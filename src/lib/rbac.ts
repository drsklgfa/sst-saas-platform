import type { CompanyUserRole, MembershipRole } from '@prisma/client';

export type Permission =
  | 'company.read'
  | 'company.write'
  | 'access.manage'
  | 'campaign.manage'
  | 'response.moderate'
  | 'inspection.manage'
  | 'document.edit'
  | 'document.issue'
  | 'document.sign'
  | 'action.manage'
  | 'message.manage'
  | 'backup.manage'
  | 'settings.manage'
  | 'audit.read'
  | 'security.manage'
  | 'system.read';

export type CompanyPermission =
  | 'portal.dashboard'
  | 'document.read'
  | 'action.read'
  | 'action.update'
  | 'action.evidence'
  | 'message.read'
  | 'message.create'
  | 'message.reply'
  | 'evidence.read'
  | 'access.manage';

const allTenantPermissions: Permission[] = [
  'company.read',
  'company.write',
  'access.manage',
  'campaign.manage',
  'response.moderate',
  'inspection.manage',
  'document.edit',
  'document.issue',
  'document.sign',
  'action.manage',
  'message.manage',
  'backup.manage',
  'settings.manage',
  'audit.read',
  'security.manage',
  'system.read',
];

const tenantRolePermissions: Record<MembershipRole, Permission[]> = {
  OWNER: allTenantPermissions,
  ADMIN: allTenantPermissions,
  RESPONSIBLE_TECH: allTenantPermissions.filter((permission) => !['settings.manage', 'security.manage'].includes(permission)),
  CONSULTANT: [
    'company.read',
    'company.write',
    'access.manage',
    'campaign.manage',
    'response.moderate',
    'inspection.manage',
    'document.edit',
    'document.issue',
    'action.manage',
    'message.manage',
  ],
  ASSISTANT: [
    'company.read',
    'company.write',
    'campaign.manage',
    'inspection.manage',
    'document.edit',
    'action.manage',
    'message.manage',
  ],
  REVIEWER: ['company.read', 'response.moderate', 'document.edit', 'document.issue', 'message.manage', 'audit.read'],
  COMMERCIAL: ['company.read', 'company.write', 'access.manage', 'message.manage'],
  FINANCE: ['company.read', 'message.manage', 'system.read'],
  READER: ['company.read'],
};

const allCompanyPermissions: CompanyPermission[] = [
  'portal.dashboard',
  'document.read',
  'action.read',
  'action.update',
  'action.evidence',
  'message.read',
  'message.create',
  'message.reply',
  'evidence.read',
  'access.manage',
];

export const companyRolePermissions: Record<CompanyUserRole, CompanyPermission[]> = {
  RH_ADMIN: allCompanyPermissions,
  SST: [
    'portal.dashboard',
    'document.read',
    'action.read',
    'action.update',
    'action.evidence',
    'message.read',
    'message.create',
    'message.reply',
    'evidence.read',
  ],
  MANAGER: [
    'portal.dashboard',
    'action.read',
    'action.update',
    'action.evidence',
    'message.read',
    'message.create',
    'message.reply',
    'evidence.read',
  ],
  ACTION_OWNER: ['action.read', 'action.update', 'action.evidence', 'message.read', 'message.create', 'message.reply', 'evidence.read'],
  DIRECTOR: ['portal.dashboard', 'document.read', 'action.read', 'message.read'],
  READER: ['document.read'],
  AUDITOR: ['portal.dashboard', 'document.read', 'action.read', 'evidence.read'],
};

function includesOverride(overrides: unknown, permission: string): boolean {
  return Array.isArray(overrides) && overrides.some((value) => value === permission);
}

export function hasTenantPermission(role: MembershipRole, permission: Permission, overrides: unknown = []): boolean {
  return tenantRolePermissions[role].includes(permission) || includesOverride(overrides, permission);
}

export function hasCompanyPermission(role: CompanyUserRole, permission: CompanyPermission, overrides: unknown = []): boolean {
  return companyRolePermissions[role].includes(permission) || includesOverride(overrides, permission);
}

export function tenantPermissionsFor(role: MembershipRole, overrides: unknown = []): Permission[] {
  return [...new Set([...tenantRolePermissions[role], ...(Array.isArray(overrides) ? overrides.filter((item): item is Permission => typeof item === 'string' && allTenantPermissions.includes(item as Permission)) : [])])];
}

export function companyPermissionsFor(role: CompanyUserRole, overrides: unknown = []): CompanyPermission[] {
  return [...new Set([...companyRolePermissions[role], ...(Array.isArray(overrides) ? overrides.filter((item): item is CompanyPermission => typeof item === 'string' && allCompanyPermissions.includes(item as CompanyPermission)) : [])])];
}
