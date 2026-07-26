declare module '@prisma/client' {
  export namespace Prisma {
    export type JsonPrimitive = string | number | boolean | null;
    export type JsonObject = { [Key in string]?: JsonValue };
    export interface JsonArray extends Array<JsonValue> {}
    export type JsonValue = JsonPrimitive | JsonObject | JsonArray;
    export type InputJsonObject = { readonly [Key in string]?: InputJsonValue | null };
    export interface InputJsonArray extends ReadonlyArray<InputJsonValue | null> {}
    export type InputJsonValue = string | number | boolean | InputJsonObject | InputJsonArray | { toJSON(): unknown };
    export const JsonNull: unique symbol;
    export const DbNull: unique symbol;
    export const AnyNull: unique symbol;
    export type JsonNull = typeof JsonNull;
    export type NullableJsonNullValueInput = typeof DbNull | typeof JsonNull;
    export type TransactionClient = PrismaClient;
    export type SortOrder = 'asc' | 'desc';
    export class PrismaClientKnownRequestError extends Error { code: string; meta?: unknown }
  }
  export const MembershipRole: { readonly OWNER: 'OWNER'; readonly ADMIN: 'ADMIN'; readonly RESPONSIBLE_TECH: 'RESPONSIBLE_TECH'; readonly CONSULTANT: 'CONSULTANT'; readonly ASSISTANT: 'ASSISTANT'; readonly REVIEWER: 'REVIEWER'; readonly COMMERCIAL: 'COMMERCIAL'; readonly FINANCE: 'FINANCE'; readonly READER: 'READER' };
  export type MembershipRole = (typeof MembershipRole)[keyof typeof MembershipRole];
  export const CompanyUserRole: { readonly RH_ADMIN: 'RH_ADMIN'; readonly SST: 'SST'; readonly MANAGER: 'MANAGER'; readonly ACTION_OWNER: 'ACTION_OWNER'; readonly DIRECTOR: 'DIRECTOR'; readonly READER: 'READER'; readonly AUDITOR: 'AUDITOR' };
  export type CompanyUserRole = (typeof CompanyUserRole)[keyof typeof CompanyUserRole];
  export const CompanyStatus: { readonly ACTIVE: 'ACTIVE'; readonly INACTIVE: 'INACTIVE'; readonly ARCHIVED: 'ARCHIVED' };
  export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];
  export const CampaignStatus: { readonly DRAFT: 'DRAFT'; readonly SCHEDULED: 'SCHEDULED'; readonly ACTIVE: 'ACTIVE'; readonly PAUSED: 'PAUSED'; readonly CLOSED: 'CLOSED'; readonly REOPENED: 'REOPENED'; readonly ARCHIVED: 'ARCHIVED'; readonly CANCELLED: 'CANCELLED' };
  export type CampaignStatus = (typeof CampaignStatus)[keyof typeof CampaignStatus];
  export const QuestionType: { readonly YES_NO: 'YES_NO'; readonly SINGLE_CHOICE: 'SINGLE_CHOICE'; readonly MULTI_CHOICE: 'MULTI_CHOICE'; readonly LIKERT: 'LIKERT'; readonly NUMBER: 'NUMBER'; readonly TEXT: 'TEXT'; readonly LONG_TEXT: 'LONG_TEXT'; readonly DATE: 'DATE'; readonly BODY_MAP: 'BODY_MAP'; readonly MATRIX: 'MATRIX'; readonly FILE: 'FILE' };
  export type QuestionType = (typeof QuestionType)[keyof typeof QuestionType];
  export const ResponseStatus: { readonly STARTED: 'STARTED'; readonly SUBMITTED: 'SUBMITTED'; readonly INVALIDATED: 'INVALIDATED' };
  export type ResponseStatus = (typeof ResponseStatus)[keyof typeof ResponseStatus];
  export const InspectionStatus: { readonly DRAFT: 'DRAFT'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly COMPLETED: 'COMPLETED'; readonly REVIEWED: 'REVIEWED' };
  export type InspectionStatus = (typeof InspectionStatus)[keyof typeof InspectionStatus];
  export const RiskLevel: { readonly VERY_LOW: 'VERY_LOW'; readonly LOW: 'LOW'; readonly MODERATE: 'MODERATE'; readonly HIGH: 'HIGH'; readonly CRITICAL: 'CRITICAL' };
  export type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];
  export const InspectionEvidenceKind: { readonly PHOTO: 'PHOTO'; readonly DOCUMENT: 'DOCUMENT'; readonly MEASUREMENT: 'MEASUREMENT'; readonly OTHER: 'OTHER' };
  export type InspectionEvidenceKind = (typeof InspectionEvidenceKind)[keyof typeof InspectionEvidenceKind];
  export const ActionStatus: { readonly DRAFT: 'DRAFT'; readonly PENDING_APPROVAL: 'PENDING_APPROVAL'; readonly NOT_STARTED: 'NOT_STARTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_EVIDENCE: 'WAITING_EVIDENCE'; readonly WAITING_VALIDATION: 'WAITING_VALIDATION'; readonly COMPLETED: 'COMPLETED'; readonly PARTIAL: 'PARTIAL'; readonly REJECTED: 'REJECTED'; readonly CANCELLED: 'CANCELLED'; readonly OVERDUE: 'OVERDUE'; readonly EFFECTIVENESS_VERIFIED: 'EFFECTIVENESS_VERIFIED' };
  export type ActionStatus = (typeof ActionStatus)[keyof typeof ActionStatus];
  export const DocumentStatus: { readonly DRAFT: 'DRAFT'; readonly REVIEW: 'REVIEW'; readonly PREVIEW: 'PREVIEW'; readonly WAITING_DOCUMENTS: 'WAITING_DOCUMENTS'; readonly WAITING_SIGNATURE: 'WAITING_SIGNATURE'; readonly ISSUED_UNSIGNED: 'ISSUED_UNSIGNED'; readonly ISSUED_SIGNED: 'ISSUED_SIGNED'; readonly REPLACED: 'REPLACED'; readonly CANCELLED: 'CANCELLED'; readonly ARCHIVED: 'ARCHIVED' };
  export type DocumentStatus = (typeof DocumentStatus)[keyof typeof DocumentStatus];
  export const SignatureMethod: { readonly INTERNAL: 'INTERNAL'; readonly EXTERNAL_UPLOAD: 'EXTERNAL_UPLOAD'; readonly PROVIDER: 'PROVIDER'; readonly CERTIFICATE: 'CERTIFICATE'; readonly NONE: 'NONE' };
  export type SignatureMethod = (typeof SignatureMethod)[keyof typeof SignatureMethod];
  export const ConversationStatus: { readonly NEW: 'NEW'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_COMPANY: 'WAITING_COMPANY'; readonly WAITING_CONSULTANT: 'WAITING_CONSULTANT'; readonly RESOLVED: 'RESOLVED'; readonly ARCHIVED: 'ARCHIVED'; readonly REOPENED: 'REOPENED' };
  export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];
  export const MessageChannel: { readonly PORTAL: 'PORTAL'; readonly EMAIL: 'EMAIL'; readonly WHATSAPP: 'WHATSAPP'; readonly SYSTEM: 'SYSTEM' };
  export type MessageChannel = (typeof MessageChannel)[keyof typeof MessageChannel];
  export const NotificationType: { readonly MESSAGE: 'MESSAGE'; readonly EVIDENCE: 'EVIDENCE'; readonly REPORT: 'REPORT'; readonly ACTION: 'ACTION'; readonly CAMPAIGN: 'CAMPAIGN'; readonly BACKUP: 'BACKUP'; readonly ACCESS: 'ACCESS'; readonly JOB: 'JOB'; readonly SYSTEM: 'SYSTEM' };
  export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
  export const JobStatus: { readonly QUEUED: 'QUEUED'; readonly RUNNING: 'RUNNING'; readonly SUCCEEDED: 'SUCCEEDED'; readonly FAILED: 'FAILED'; readonly CANCELLED: 'CANCELLED' };
  export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];
  export const FileVisibility: { readonly PRIVATE: 'PRIVATE'; readonly COMPANY: 'COMPANY'; readonly PUBLIC_VERIFICATION: 'PUBLIC_VERIFICATION' };
  export type FileVisibility = (typeof FileVisibility)[keyof typeof FileVisibility];
  export const BackupType: { readonly COMPANY_FULL: 'COMPANY_FULL'; readonly COMPANY_DATA: 'COMPANY_DATA'; readonly PLATFORM_FULL: 'PLATFORM_FULL'; readonly PLATFORM_DATA: 'PLATFORM_DATA'; readonly DOCUMENTS_ONLY: 'DOCUMENTS_ONLY' };
  export type BackupType = (typeof BackupType)[keyof typeof BackupType];
  export const IntegrationProvider: { readonly DISABLED: 'DISABLED'; readonly SMTP: 'SMTP'; readonly RESEND: 'RESEND'; readonly GEMINI: 'GEMINI'; readonly WHATSAPP_CLOUD: 'WHATSAPP_CLOUD'; readonly CUSTOM: 'CUSTOM' };
  export type IntegrationProvider = (typeof IntegrationProvider)[keyof typeof IntegrationProvider];
  export const ServiceStatus: { readonly PROPOSAL: 'PROPOSAL'; readonly CONTRACTED: 'CONTRACTED'; readonly IN_PROGRESS: 'IN_PROGRESS'; readonly WAITING_CLIENT: 'WAITING_CLIENT'; readonly DELIVERED: 'DELIVERED'; readonly COMPLETED: 'COMPLETED'; readonly SUSPENDED: 'SUSPENDED'; readonly CANCELLED: 'CANCELLED'; readonly EXPIRED: 'EXPIRED' };
  export type ServiceStatus = (typeof ServiceStatus)[keyof typeof ServiceStatus];
  export const IncidentSeverity: { readonly LOW: 'LOW'; readonly MEDIUM: 'MEDIUM'; readonly HIGH: 'HIGH'; readonly CRITICAL: 'CRITICAL' };
  export type IncidentSeverity = (typeof IncidentSeverity)[keyof typeof IncidentSeverity];
  export const IncidentStatus: { readonly OPEN: 'OPEN'; readonly INVESTIGATING: 'INVESTIGATING'; readonly CONTAINED: 'CONTAINED'; readonly RESOLVED: 'RESOLVED'; readonly CLOSED: 'CLOSED' };
  export type IncidentStatus = (typeof IncidentStatus)[keyof typeof IncidentStatus];
  export const RecoveryTestStatus: { readonly QUEUED: 'QUEUED'; readonly RUNNING: 'RUNNING'; readonly PASSED: 'PASSED'; readonly FAILED: 'FAILED' };
  export type RecoveryTestStatus = (typeof RecoveryTestStatus)[keyof typeof RecoveryTestStatus];
  export interface Tenant { id: string; [key: string]: any }
  export interface User { id: string; [key: string]: any }
  export interface Membership { id: string; [key: string]: any }
  export interface UserInvite { id: string; [key: string]: any }
  export interface Session { id: string; [key: string]: any }
  export interface Company { id: string; [key: string]: any }
  export interface CompanyContact { id: string; [key: string]: any }
  export interface CompanyAccess { id: string; [key: string]: any }
  export interface Establishment { id: string; [key: string]: any }
  export interface Sector { id: string; [key: string]: any }
  export interface GHE { id: string; [key: string]: any }
  export interface JobFunction { id: string; [key: string]: any }
  export interface Workstation { id: string; [key: string]: any }
  export interface ServiceContract { id: string; [key: string]: any }
  export interface Questionnaire { id: string; [key: string]: any }
  export interface QuestionnaireVersion { id: string; [key: string]: any }
  export interface Question { id: string; [key: string]: any }
  export interface QuestionOption { id: string; [key: string]: any }
  export interface Campaign { id: string; [key: string]: any }
  export interface CampaignTarget { id: string; [key: string]: any }
  export interface CampaignQuestionnaire { id: string; [key: string]: any }
  export interface AnonymousCode { id: string; [key: string]: any }
  export interface ResponseSession { id: string; [key: string]: any }
  export interface Answer { id: string; [key: string]: any }
  export interface BodyPain { id: string; [key: string]: any }
  export interface Inspection { id: string; [key: string]: any }
  export interface InspectionItem { id: string; [key: string]: any }
  export interface InspectionEvidence { id: string; [key: string]: any }
  export interface Methodology { id: string; [key: string]: any }
  export interface Calculation { id: string; [key: string]: any }
  export interface Risk { id: string; [key: string]: any }
  export interface ActionPlan { id: string; [key: string]: any }
  export interface ActionItem { id: string; [key: string]: any }
  export interface ActionEvidence { id: string; [key: string]: any }
  export interface DocumentType { id: string; [key: string]: any }
  export interface DocumentTemplate { id: string; [key: string]: any }
  export interface DocumentTemplateVersion { id: string; [key: string]: any }
  export interface Document { id: string; [key: string]: any }
  export interface DocumentVersion { id: string; [key: string]: any }
  export interface DocumentSnapshot { id: string; [key: string]: any }
  export interface DocumentSection { id: string; [key: string]: any }
  export interface DocumentFile { id: string; [key: string]: any }
  export interface Signature { id: string; [key: string]: any }
  export interface DocumentAuditRun { id: string; [key: string]: any }
  export interface Conversation { id: string; [key: string]: any }
  export interface ConversationParticipant { id: string; [key: string]: any }
  export interface Message { id: string; [key: string]: any }
  export interface MessageAttachment { id: string; [key: string]: any }
  export interface EntityComment { id: string; [key: string]: any }
  export interface CommentAttachment { id: string; [key: string]: any }
  export interface Notification { id: string; [key: string]: any }
  export interface FileObject { id: string; [key: string]: any }
  export interface BackupExport { id: string; [key: string]: any }
  export interface ImportRun { id: string; [key: string]: any }
  export interface Job { id: string; [key: string]: any }
  export interface TenantSecurityPolicy { id: string; [key: string]: any }
  export interface SecurityIncident { id: string; [key: string]: any }
  export interface RecoveryTest { id: string; [key: string]: any }
  export interface ServiceHeartbeat { id: string; [key: string]: any }
  export interface IntegrationConfig { id: string; [key: string]: any }
  export interface AuditLog { id: string; [key: string]: any }
  export class PrismaClient {
    constructor(options?: any);
    tenant: any;
    user: any;
    membership: any;
    userInvite: any;
    session: any;
    company: any;
    companyContact: any;
    companyAccess: any;
    establishment: any;
    sector: any;
    gHE: any;
    jobFunction: any;
    workstation: any;
    serviceContract: any;
    questionnaire: any;
    questionnaireVersion: any;
    question: any;
    questionOption: any;
    campaign: any;
    campaignTarget: any;
    campaignQuestionnaire: any;
    anonymousCode: any;
    responseSession: any;
    answer: any;
    bodyPain: any;
    inspection: any;
    inspectionItem: any;
    inspectionEvidence: any;
    methodology: any;
    calculation: any;
    risk: any;
    actionPlan: any;
    actionItem: any;
    actionEvidence: any;
    documentType: any;
    documentTemplate: any;
    documentTemplateVersion: any;
    document: any;
    documentVersion: any;
    documentSnapshot: any;
    documentSection: any;
    documentFile: any;
    signature: any;
    documentAuditRun: any;
    conversation: any;
    conversationParticipant: any;
    message: any;
    messageAttachment: any;
    entityComment: any;
    commentAttachment: any;
    notification: any;
    fileObject: any;
    backupExport: any;
    importRun: any;
    job: any;
    tenantSecurityPolicy: any;
    securityIncident: any;
    recoveryTest: any;
    serviceHeartbeat: any;
    integrationConfig: any;
    auditLog: any;
    $transaction<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T>;
    $transaction<T extends readonly unknown[]>(items: T): Promise<T>;
    $queryRaw<T = unknown>(query: TemplateStringsArray | any, ...values: any[]): Promise<T>;
    $executeRaw(query: TemplateStringsArray | any, ...values: any[]): Promise<number>;
    $disconnect(): Promise<void>;
  }
}
