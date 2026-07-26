import type { DefaultSection } from './default-sections';

export interface TemplateSchema {
  sections: DefaultSection[];
}

export function parseTemplateSchema(value: unknown): TemplateSchema {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const sections = Array.isArray(raw.sections) ? raw.sections : [];
  const normalized = sections
    .map((section, index) => {
      if (!section || typeof section !== 'object') return null;
      const candidate = section as Record<string, unknown>;
      const code = String(candidate.code ?? '').trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9_]/g, '_');
      const title = String(candidate.title ?? '').trim();
      const html = String(candidate.html ?? candidate.content ?? '').trim();
      if (!code || !title) return null;
      return { code, title, html: html || '<p>Preencha esta seção.</p>', position: index };
    })
    .filter((section): section is DefaultSection & { position: number } => Boolean(section));
  return { sections: normalized };
}

export function validateTemplateSchema(value: unknown): string[] {
  const parsed = parseTemplateSchema(value);
  const errors: string[] = [];
  if (parsed.sections.length < 1) errors.push('Inclua ao menos uma seção no modelo.');
  const codes = new Set<string>();
  for (const section of parsed.sections) {
    if (codes.has(section.code)) errors.push(`Código de seção repetido: ${section.code}.`);
    codes.add(section.code);
  }
  return errors;
}
