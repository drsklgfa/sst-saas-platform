export type DocumentAuditSeverity = 'PASS' | 'WARNING' | 'ERROR';

export interface DocumentAuditCheck {
  code: string;
  title: string;
  severity: DocumentAuditSeverity;
  message: string;
  sectionCode?: string;
}

export interface DocumentAuditResult {
  status: 'PASS' | 'WARNING' | 'ERROR';
  warningCount: number;
  errorCount: number;
  checks: DocumentAuditCheck[];
}

type AnyRecord = Record<string, any>;

function list(value: unknown): AnyRecord[] {
  return Array.isArray(value) ? value.filter((item): item is AnyRecord => Boolean(item && typeof item === 'object')) : [];
}

function check(code: string, title: string, ok: boolean, failureMessage: string, severity: Exclude<DocumentAuditSeverity, 'PASS'> = 'WARNING', sectionCode?: string): DocumentAuditCheck {
  return ok
    ? { code, title, severity: 'PASS', message: 'Verificação atendida.', sectionCode }
    : { code, title, severity, message: failureMessage, sectionCode };
}

export function auditDocumentSnapshot(snapshot: unknown, options: { signatureCount?: number } = {}): DocumentAuditResult {
  const root = (snapshot && typeof snapshot === 'object' ? snapshot : {}) as AnyRecord;
  const document = (root.document ?? {}) as AnyRecord;
  const company = (root.company ?? {}) as AnyRecord;
  const sections = list(root.sections);
  const risks = list(company.risks);
  const plans = list(company.actionPlans);
  const actions = plans.flatMap((plan) => list(plan.items));
  const establishments = list(company.establishments);
  const inspections = list(company.inspections);
  const signatures = options.signatureCount ?? 0;
  const typeCode = String(document.type?.code ?? document.documentTypeCode ?? 'CUSTOM');

  const enabledSections = sections.filter((section) => section.enabled !== false);
  const emptySections = enabledSections.filter((section) => {
    const html = String(section.content?.html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    return html.length < 10;
  });
  const highRisks = risks.filter((risk) => ['HIGH', 'CRITICAL'].includes(String(risk.initialLevel ?? '')));
  const risksWithActions = new Set(actions.map((action) => action.riskId).filter(Boolean));
  const uncoveredHighRisks = highRisks.filter((risk) => !risksWithActions.has(risk.id));
  const incompleteActions = actions.filter((action) => !action.responsible || !action.dueDate);
  const calculations = inspections.flatMap((inspection) => list(inspection.calculations));

  const checks: DocumentAuditCheck[] = [
    check('DOC_TITLE', 'Título do documento', String(document.title ?? '').trim().length >= 5, 'O documento precisa de um título identificável.', 'ERROR'),
    check('COMPANY_LEGAL_NAME', 'Razão social', String(company.legalName ?? '').trim().length >= 3, 'Razão social não preenchida.', 'ERROR', 'IDENTIFICATION'),
    check('COMPANY_CNPJ', 'CNPJ', /^\d{14}$/.test(String(company.cnpj ?? '').replace(/\D/g, '')), 'CNPJ ausente ou inválido.', 'WARNING', 'IDENTIFICATION'),
    check('ESTABLISHMENT', 'Estabelecimento', establishments.length > 0, 'Nenhum estabelecimento foi incluído no cadastro da empresa.', 'WARNING', 'IDENTIFICATION'),
    check('SECTIONS_PRESENT', 'Estrutura documental', enabledSections.length >= 3, 'O documento possui poucas seções habilitadas.', 'ERROR'),
    check('SECTIONS_CONTENT', 'Conteúdo das seções', emptySections.length === 0, `${emptySections.length} seção(ões) estão sem conteúdo técnico suficiente.`, 'WARNING'),
    check('RISK_INVENTORY', 'Inventário de riscos', risks.length > 0 || ['OS', 'CUSTOM'].includes(typeCode), 'Nenhum risco foi relacionado ao documento.', typeCode === 'PGR' ? 'ERROR' : 'WARNING', 'RISKS'),
    check('HIGH_RISK_ACTIONS', 'Ações para riscos relevantes', uncoveredHighRisks.length === 0, `${uncoveredHighRisks.length} risco(s) alto(s) ou crítico(s) não possuem ação vinculada.`, 'ERROR', 'ACTION_PLAN'),
    check('ACTION_OWNERS', 'Responsáveis e prazos', incompleteActions.length === 0, `${incompleteActions.length} ação(ões) estão sem responsável ou prazo.`, 'WARNING', 'ACTION_PLAN'),
    check('SIGNATURE', 'Aprovação técnica', signatures > 0, 'Nenhuma assinatura ou aprovação técnica foi registrada para esta revisão.', 'WARNING', 'SIGNATURES'),
  ];

  if (['AET', 'AEP'].includes(typeCode)) {
    checks.push(check('ERGONOMIC_CALCULATION', 'Métodos ergonômicos', calculations.length > 0, 'Nenhum cálculo ergonômico foi incluído nas vistorias relacionadas.', 'WARNING', 'ERGONOMIC_TOOLS'));
  }
  if (typeCode === 'LTCAT') {
    checks.push(check('LTCAT_GHE', 'Caracterização por GHE', risks.some((risk) => Boolean(risk.gheId || risk.ghe)), 'O LTCAT não possui riscos associados a GHEs.', 'ERROR', 'AGENTS'));
    checks.push(check('LTCAT_MEASUREMENT', 'Avaliações e memórias', calculations.length > 0 || inspections.length > 0, 'Nenhuma vistoria, avaliação ou memória de cálculo foi relacionada.', 'WARNING', 'MEASUREMENTS'));
  }
  if (typeCode === 'PGR') {
    checks.push(check('PGR_ACTION_PLAN', 'Plano de ação do PGR', actions.length > 0, 'O PGR não possui ações cadastradas.', 'ERROR', 'ACTION_PLAN'));
  }

  const warningCount = checks.filter((item) => item.severity === 'WARNING').length;
  const errorCount = checks.filter((item) => item.severity === 'ERROR').length;
  return {
    status: errorCount ? 'ERROR' : warningCount ? 'WARNING' : 'PASS',
    warningCount,
    errorCount,
    checks,
  };
}
