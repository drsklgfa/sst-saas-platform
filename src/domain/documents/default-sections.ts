export type DefaultSection = { code: string; title: string; html: string };

const common: DefaultSection[] = [
  { code: 'IDENTIFICATION', title: 'Identificação da organização', html: '<p>Caracterize a empresa, estabelecimento, setores e grupos avaliados.</p>' },
  { code: 'OBJECTIVE', title: 'Objetivos', html: '<p>Descreva o objetivo, o escopo e os limites desta avaliação.</p>' },
  { code: 'LEGAL', title: 'Referências legais e técnicas', html: '<p>Registre as normas, referências metodológicas e critérios considerados.</p>' },
  { code: 'METHOD', title: 'Metodologia', html: '<p>Descreva as etapas, fontes de dados, instrumentos e critérios de avaliação.</p>' },
  { code: 'CHARACTERIZATION', title: 'Caracterização das atividades', html: '<p>Descreva processos, organização do trabalho, tarefas e grupos expostos.</p>' },
  { code: 'RESULTS', title: 'Resultados e análise técnica', html: '<p>Apresente resultados, evidências, cálculos, medições e interpretação profissional.</p>' },
  { code: 'RISKS', title: 'Classificação dos riscos', html: '<p>Apresente a matriz, critérios, riscos iniciais e residuais.</p>' },
  { code: 'ACTION_PLAN', title: 'Plano de ação', html: '<p>Relacione medidas, responsáveis, prazos, métodos, custos e prioridades.</p>' },
  { code: 'CONCLUSION', title: 'Conclusão técnica', html: '<p>Registre a conclusão do responsável técnico e as ressalvas aplicáveis.</p>' },
  { code: 'SIGNATURES', title: 'Responsáveis e assinaturas', html: '<p>Insira responsáveis, registros profissionais, ART e método de assinatura quando aplicável.</p>' },
  { code: 'ANNEXES', title: 'Anexos', html: '<p>Relacione fotos, certificados, memórias de cálculo, planilhas e evidências.</p>' }
];

const overrides: Record<string, DefaultSection[]> = {
  AEP: [
    { code: 'PARTICIPATION', title: 'Participação dos trabalhadores', html: '<p>Apresente a forma de participação, adesão e resultados consolidados.</p>' },
    { code: 'BODY_MAP', title: 'Mapa de desconfortos corporais', html: '<p>Apresente as regiões indicadas e respectivas intensidades consolidadas.</p>' }
  ],
  AET: [
    { code: 'DEMAND', title: 'Análise da demanda', html: '<p>Descreva a demanda, seus determinantes e as situações que motivaram a AET.</p>' },
    { code: 'ACTIVITY_ANALYSIS', title: 'Análise da atividade', html: '<p>Compare trabalho prescrito e real, variabilidades, estratégias e exigências.</p>' },
    { code: 'ERGONOMIC_TOOLS', title: 'Ferramentas ergonômicas', html: '<p>Apresente RULA, REBA, NIOSH, Moore & Garg ou outros métodos aplicados.</p>' }
  ],
  PSY: [
    { code: 'ANONYMITY', title: 'Critérios de anonimato e consolidação', html: '<p>Registre limites mínimos, supressão de grupos pequenos e proteção contra identificação.</p>' },
    { code: 'DIMENSIONS', title: 'Dimensões psicossociais', html: '<p>Apresente carga mental, ritmo, autonomia, apoio, papéis, reconhecimento e equilíbrio vida-trabalho.</p>' }
  ],
  PGR: [
    { code: 'INVENTORY', title: 'Inventário de riscos ocupacionais', html: '<p>Caracterize perigos, fontes, grupos expostos, controles, avaliação e classificação.</p>' },
    { code: 'GRO', title: 'Gerenciamento contínuo dos riscos', html: '<p>Descreva responsabilidades, revisão, comunicação, participação e acompanhamento.</p>' }
  ],
  LTCAT: [
    { code: 'AGENTS', title: 'Agentes e condições de exposição', html: '<p>Descreva agentes físicos, químicos e biológicos por GHE e atividade.</p>' },
    { code: 'MEASUREMENTS', title: 'Avaliações qualitativas e quantitativas', html: '<p>Informe resultados, equipamentos, certificados, laboratórios e incertezas.</p>' }
  ],
  INSAL: [{ code: 'ANNEX_FRAMEWORK', title: 'Enquadramento técnico', html: '<p>Analise atividades, agentes, exposição, controles e critérios aplicáveis.</p>' }],
  PERIC: [{ code: 'DANGEROUS_CONDITIONS', title: 'Caracterização das condições perigosas', html: '<p>Descreva atividades, áreas, operações e permanência nas condições avaliadas.</p>' }],
  APR: [{ code: 'STEPS', title: 'Etapas da atividade e controles', html: '<p>Divida a atividade em etapas, perigos, riscos, controles e responsáveis.</p>' }],
  OS: [{ code: 'WORKER_GUIDANCE', title: 'Orientações ao trabalhador', html: '<p>Liste riscos, medidas, EPIs, proibições, procedimentos e ciência.</p>' }],
  CUSTOM: []
};

export function getDefaultSections(code: string): DefaultSection[] {
  const specialized = overrides[code] ?? [];
  const insertAt = Math.max(0, common.findIndex((section) => section.code === 'RESULTS'));
  return [...common.slice(0, insertAt), ...specialized, ...common.slice(insertAt)];
}
