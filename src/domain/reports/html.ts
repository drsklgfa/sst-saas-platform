import { escapeHtml } from './sanitize';

export interface ReportHtmlInput {
  title: string;
  company: string;
  cnpj?: string | null;
  tenantName?: string | null;
  version: number;
  sections: Array<{ title: string; html: string }>;
  warnings?: string[];
  signatures?: Array<{ signerName: string; signerRegistration?: string | null; signatureRole?: string | null; signedAt?: string | Date | null; method: string }>;
  snapshotHash: string;
  verificationUrl: string;
  official: boolean;
}

export function buildReportHtml(input: ReportHtmlInput): string {
  const date = new Date().toLocaleDateString('pt-BR');
  const signatures = input.signatures ?? [];
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><style>
@page{size:A4;margin:22mm 16mm 20mm}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#172033;font-size:11px;line-height:1.5}h1{font-size:25px;color:#0f766e}h2{font-size:17px;border-bottom:2px solid #0f766e;padding-bottom:5px;margin-top:26px}h3{font-size:13px}table{width:100%;border-collapse:collapse;margin:10px 0;page-break-inside:auto}tr{page-break-inside:avoid}th,td{border:1px solid #cbd5e1;padding:6px;vertical-align:top}th{background:#ecfdf5}.cover{height:230mm;display:flex;flex-direction:column;justify-content:center}.meta{color:#475569}.warning{padding:8px;background:#fff7ed;border:1px solid #fdba74;margin:6px 0}.footer{position:fixed;bottom:-12mm;font-size:8px;color:#64748b;width:100%;text-align:center}.watermark{position:fixed;inset:40% 0 auto;transform:rotate(-28deg);font-size:54px;font-weight:700;color:rgba(185,28,28,.13);text-align:center;z-index:999;pointer-events:none}.integrity{margin-top:25px;padding:10px;border:1px solid #cbd5e1;background:#f8fafc;font-size:9px;word-break:break-all}.signature-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.signature{border-top:1px solid #334155;padding-top:7px;margin-top:28px}</style></head><body>${input.official ? '' : '<div class="watermark">PRÉVIA — NÃO OFICIAL</div>'}<div class="footer">${escapeHtml(input.company)} · Revisão ${input.version} · ${input.official ? 'Documento oficial' : 'Prévia não oficial'}</div><section class="cover"><p class="meta">${escapeHtml(input.tenantName ?? 'Plataforma SST')}</p><h1>${escapeHtml(input.title)}</h1><p class="meta">${escapeHtml(input.company)}${input.cnpj ? ` · CNPJ ${escapeHtml(input.cnpj)}` : ''}</p><p class="meta">Revisão ${input.version} · ${date}</p><p class="meta">Situação: ${input.official ? 'EMITIDO' : 'PRÉVIA PARA REVISÃO'}</p></section>${(input.warnings ?? []).map((warning) => `<div class="warning">${escapeHtml(warning)}</div>`).join('')}${input.sections.map((section) => `<section><h2>${escapeHtml(section.title)}</h2>${section.html}</section>`).join('')}<section><h2>Responsáveis e aprovações</h2>${signatures.length ? `<div class="signature-grid">${signatures.map((signature) => `<div class="signature"><strong>${escapeHtml(signature.signerName)}</strong><br>${escapeHtml(signature.signerRegistration ?? 'Registro não informado')}<br>${escapeHtml(signature.signatureRole ?? 'Responsável técnico')} · ${escapeHtml(signature.method)}<br>${signature.signedAt ? escapeHtml(new Date(signature.signedAt).toLocaleString('pt-BR')) : 'Pendente'}</div>`).join('')}</div>` : '<p>Nenhuma aprovação registrada nesta revisão.</p>'}</section><section class="integrity"><strong>Integridade e verificação</strong><br>Hash do snapshot: ${escapeHtml(input.snapshotHash)}<br>Verificação pública: ${escapeHtml(input.verificationUrl)}</section></body></html>`;
}
