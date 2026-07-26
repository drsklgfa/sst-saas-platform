const views = {
  overview: `
    <section class="demo-view">
      <div class="view-head"><div><span>VISÃO GERAL</span><h3>Operação em tempo real</h3><p>Indicadores técnicos, comerciais e operacionais da consultoria.</p></div><button>+ Nova empresa</button></div>
      <div class="demo-kpis">
        <div class="demo-kpi"><span>Empresas ativas <i>▤</i></span><strong>48</strong><small class="good">↗ 12% nos últimos 30 dias</small></div>
        <div class="demo-kpi"><span>Campanhas ativas <i>◉</i></span><strong>16</strong><small>1.284 respostas coletadas</small></div>
        <div class="demo-kpi"><span>Documentos <i>◇</i></span><strong>127</strong><small>8 aguardando revisão</small></div>
        <div class="demo-kpi"><span>Ações abertas <i>✓</i></span><strong>34</strong><small class="bad">5 ações com prazo vencido</small></div>
      </div>
      <div class="demo-panels">
        <article class="demo-panel"><div class="panel-head"><div><h4>Volume de avaliações</h4><p>Execuções concluídas por mês</p></div><button>Últimos 6 meses⌄</button></div><div class="demo-bars"><div><i style="height:42%"></i><small>FEV</small></div><div><i style="height:58%"></i><small>MAR</small></div><div><i style="height:49%"></i><small>ABR</small></div><div><i style="height:77%"></i><small>MAI</small></div><div><i style="height:64%"></i><small>JUN</small></div><div><i style="height:91%"></i><small>JUL</small></div></div></article>
        <article class="demo-panel"><div class="panel-head"><div><h4>Atividade recente</h4><p>Últimas movimentações</p></div><button>Ver auditoria</button></div><div class="activity-list"><div class="activity-row"><span>◇</span><div><strong>PGR liberado para o cliente</strong><small>Metalúrgica Atlas</small></div><time>12 min</time></div><div class="activity-row"><span>✓</span><div><strong>Evidência aprovada</strong><small>Adequação do posto de trabalho</small></div><time>38 min</time></div><div class="activity-row"><span>◉</span><div><strong>Campanha psicossocial iniciada</strong><small>Grupo Horizonte</small></div><time>1 h</time></div><div class="activity-row"><span>▤</span><div><strong>Nova unidade cadastrada</strong><small>Logística Norte</small></div><time>2 h</time></div></div></article>
      </div>
    </section>`,
  companies: `
    <section class="demo-view"><div class="view-head"><div><span>EMPRESAS</span><h3>Clientes e unidades</h3><p>Cadastros, estruturas organizacionais, contatos e serviços contratados.</p></div><button>+ Cadastrar empresa</button></div>
      <div class="demo-kpis"><div class="demo-kpi"><span>Total de empresas <i>▤</i></span><strong>52</strong><small>48 ativas</small></div><div class="demo-kpi"><span>Unidades <i>⌂</i></span><strong>84</strong><small>Em 7 estados</small></div><div class="demo-kpi"><span>Trabalhadores <i>◎</i></span><strong>4.827</strong><small>Base consolidada</small></div><div class="demo-kpi"><span>Renovações <i>↻</i></span><strong>9</strong><small class="bad">Próximos 30 dias</small></div></div>
      <div class="data-table"><div class="table-toolbar"><div class="table-search">⌕ Buscar por razão social, CNPJ ou contato...</div><button class="table-filter">Status: Todas⌄</button><button class="table-filter">Ordenar⌄</button></div><div class="table-row header"><span>Empresa</span><span>Estrutura</span><span>Serviços</span><span>Status</span><span></span></div><div class="table-row"><div class="table-identity"><span class="company-avatar green">MA</span><strong>Metalúrgica Atlas</strong></div><span>4 unidades · 18 GHEs</span><span>8 ativos</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><div class="table-identity"><span class="company-avatar blue">GH</span><strong>Grupo Horizonte</strong></div><span>2 unidades · 9 GHEs</span><span>5 ativos</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><div class="table-identity"><span class="company-avatar amber">LN</span><strong>Logística Norte</strong></div><span>6 unidades · 24 GHEs</span><span>11 ativos</span><span class="status-pill warning">Renovação</span><span>•••</span></div><div class="table-row"><div class="table-identity"><span class="company-avatar green">VC</span><strong>Vitta Construções</strong></div><span>3 unidades · 14 GHEs</span><span>7 ativos</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><div class="table-identity"><span class="company-avatar blue">FC</span><strong>Farmacêutica Central</strong></div><span>1 unidade · 7 GHEs</span><span>4 ativos</span><span class="status-pill blue">Onboarding</span><span>•••</span></div></div>
    </section>`,
  campaigns: `
    <section class="demo-view"><div class="view-head"><div><span>CAMPANHAS</span><h3>Questionários e avaliações</h3><p>Coleta anônima, controle de participação, moderação e consolidação.</p></div><button>+ Nova campanha</button></div>
      <div class="demo-kpis"><div class="demo-kpi"><span>Campanhas ativas <i>◉</i></span><strong>16</strong><small>8 psicossociais</small></div><div class="demo-kpi"><span>Respostas <i>✓</i></span><strong>1.284</strong><small class="good">72% de participação</small></div><div class="demo-kpi"><span>Agendadas <i>◷</i></span><strong>6</strong><small>Próximos 15 dias</small></div><div class="demo-kpi"><span>Em moderação <i>⌁</i></span><strong>23</strong><small>Respostas sinalizadas</small></div></div>
      <div class="data-table"><div class="table-toolbar"><div class="table-search">⌕ Buscar campanha...</div><button class="table-filter">Tipo: Todos⌄</button></div><div class="table-row header"><span>Campanha</span><span>Empresa</span><span>Participação</span><span>Status</span><span></span></div><div class="table-row"><strong>Riscos Psicossociais 2026</strong><span>Grupo Horizonte</span><span>186 / 224 · 83%</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><strong>Percepção Ergonômica</strong><span>Metalúrgica Atlas</span><span>97 / 180 · 54%</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><strong>Checklist de Segurança</strong><span>Logística Norte</span><span>341 / 408 · 84%</span><span class="status-pill">Ativa</span><span>•••</span></div><div class="table-row"><strong>Avaliação de Clima</strong><span>Vitta Construções</span><span>—</span><span class="status-pill blue">Agendada</span><span>•••</span></div><div class="table-row"><strong>Mapeamento de Sintomas</strong><span>Farmacêutica Central</span><span>72 / 74 · 97%</span><span class="status-pill warning">Finalizando</span><span>•••</span></div></div>
    </section>`,
  documents: `
    <section class="demo-view"><div class="view-head"><div><span>DOCUMENTOS</span><h3>Central documental</h3><p>Modelos, versões, revisão técnica, assinatura e publicação ao cliente.</p></div><button>+ Gerar documento</button></div>
      <div class="demo-kpis"><div class="demo-kpi"><span>Total emitido <i>◇</i></span><strong>127</strong><small>Este ano</small></div><div class="demo-kpi"><span>Em revisão <i>⌁</i></span><strong>8</strong><small>Responsável técnico</small></div><div class="demo-kpi"><span>Aguardando assinatura <i>✎</i></span><strong>4</strong><small>Assinatura por revisão</small></div><div class="demo-kpi"><span>Publicados <i>✓</i></span><strong>96</strong><small class="good">Disponíveis no portal</small></div></div>
      <div class="data-table"><div class="table-toolbar"><div class="table-search">⌕ Buscar documento, empresa ou versão...</div><button class="table-filter">Situação⌄</button></div><div class="table-row header"><span>Documento</span><span>Empresa</span><span>Versão</span><span>Status</span><span></span></div><div class="table-row"><strong>PGR · Programa de Gerenciamento de Riscos</strong><span>Metalúrgica Atlas</span><span>v4 · 25/07/26</span><span class="status-pill">Publicado</span><span>•••</span></div><div class="table-row"><strong>LTCAT · Laudo Técnico</strong><span>Grupo Horizonte</span><span>v2 · 24/07/26</span><span class="status-pill warning">Em revisão</span><span>•••</span></div><div class="table-row"><strong>AET · Análise Ergonômica</strong><span>Logística Norte</span><span>v1 · 23/07/26</span><span class="status-pill blue">Assinatura</span><span>•••</span></div><div class="table-row"><strong>Laudo de Insalubridade</strong><span>Vitta Construções</span><span>v3 · 20/07/26</span><span class="status-pill">Publicado</span><span>•••</span></div><div class="table-row"><strong>Inventário de Riscos</strong><span>Farmacêutica Central</span><span>Rascunho</span><span class="status-pill danger">Pendência</span><span>•••</span></div></div>
    </section>`,
  actions: `
    <section class="demo-view"><div class="view-head"><div><span>PLANOS DE AÇÃO</span><h3>Prevenção sob controle</h3><p>5W2H, responsáveis, prazos, evidências e validação técnica.</p></div><button>+ Nova ação</button></div>
      <div class="demo-kpis"><div class="demo-kpi"><span>Ações abertas <i>✓</i></span><strong>34</strong><small>Em 12 empresas</small></div><div class="demo-kpi"><span>Em andamento <i>↻</i></span><strong>19</strong><small>56% do total</small></div><div class="demo-kpi"><span>Concluídas no mês <i>★</i></span><strong>28</strong><small class="good">↗ 18% vs. mês anterior</small></div><div class="demo-kpi"><span>Vencidas <i>!</i></span><strong>5</strong><small class="bad">Prioridade imediata</small></div></div>
      <div class="data-table"><div class="table-toolbar"><div class="table-search">⌕ Buscar ação ou responsável...</div><button class="table-filter">Prioridade⌄</button></div><div class="table-row header"><span>Ação preventiva</span><span>Responsável</span><span>Prazo</span><span>Status</span><span></span></div><div class="table-row"><strong>Instalar proteção coletiva na prensa</strong><span>Carlos Mendes</span><span>25/07/26</span><span class="status-pill danger">Vencida</span><span>•••</span></div><div class="table-row"><strong>Adequar altura das bancadas</strong><span>Mariana Alves</span><span>28/07/26</span><span class="status-pill warning">Em andamento</span><span>•••</span></div><div class="table-row"><strong>Revisar treinamento NR-12</strong><span>Paulo Nunes</span><span>05/08/26</span><span class="status-pill blue">Não iniciada</span><span>•••</span></div><div class="table-row"><strong>Atualizar sinalização de emergência</strong><span>Roberta Lima</span><span>12/08/26</span><span class="status-pill warning">Em andamento</span><span>•••</span></div><div class="table-row"><strong>Validar evidência de exaustão</strong><span>Gabriel Almeida</span><span>18/08/26</span><span class="status-pill">Em validação</span><span>•••</span></div></div>
    </section>`,
  messages: `
    <section class="demo-view"><div class="view-head"><div><span>COMUNICAÇÃO</span><h3>Central de mensagens</h3><p>Conversas contextualizadas por empresa, documento, ação ou evidência.</p></div><button>+ Nova mensagem</button></div><div class="empty-view"><div><span>□</span><h4>Comunicação centralizada</h4><p>O módulo reúne mensagens externas, notas internas, anexos, notificações e comentários vinculados aos processos de SST.</p></div></div></section>`,
  audit: `
    <section class="demo-view"><div class="view-head"><div><span>AUDITORIA</span><h3>Rastreabilidade completa</h3><p>Quem fez, o que alterou, quando e em qual contexto.</p></div><button>Exportar eventos</button></div>
    <div class="data-table"><div class="table-toolbar"><div class="table-search">⌕ Filtrar por usuário, ação ou recurso...</div><button class="table-filter">Hoje⌄</button></div><div class="table-row header"><span>Evento</span><span>Usuário</span><span>Horário</span><span>Resultado</span><span></span></div><div class="table-row"><strong>DOCUMENT_RELEASED · PGR v4</strong><span>Gabriel Almeida</span><span>14:32:18</span><span class="status-pill">Sucesso</span><span>•••</span></div><div class="table-row"><strong>ACTION_EVIDENCE_APPROVED</strong><span>Carla Souza</span><span>13:58:04</span><span class="status-pill">Sucesso</span><span>•••</span></div><div class="table-row"><strong>MEMBERSHIP_UPDATED</strong><span>Gabriel Almeida</span><span>11:17:42</span><span class="status-pill">Sucesso</span><span>•••</span></div><div class="table-row"><strong>LOGIN_BLOCKED · rate limit</strong><span>Externo</span><span>09:41:13</span><span class="status-pill danger">Bloqueado</span><span>•••</span></div><div class="table-row"><strong>BACKUP_CREATED · tenant</strong><span>Sistema</span><span>03:00:00</span><span class="status-pill blue">Automático</span><span>•••</span></div></div></section>`,
  security: `
    <section class="demo-view"><div class="view-head"><div><span>SEGURANÇA</span><h3>Proteção operacional</h3><p>Controles de acesso, sessões, retenção, incidentes e integridade.</p></div><button>Revisar políticas</button></div><div class="demo-kpis"><div class="demo-kpi"><span>Sessões ativas <i>⌾</i></span><strong>14</strong><small>9 usuários</small></div><div class="demo-kpi"><span>Eventos bloqueados <i>!</i></span><strong>7</strong><small>Últimos 30 dias</small></div><div class="demo-kpi"><span>Backups íntegros <i>✓</i></span><strong>30</strong><small class="good">100% verificados</small></div><div class="demo-kpi"><span>Worker <i>↻</i></span><strong>OK</strong><small class="good">Heartbeat há 12 s</small></div></div><div class="empty-view"><div><span>⌾</span><h4>Segurança em profundidade</h4><p>Argon2id, sessões persistidas, menor privilégio, autorização contextual, arquivos criptografados, retenção configurável e trilha de auditoria.</p></div></div></section>`
};

const content = document.querySelector('#demo-content');
const tabs = document.querySelectorAll('.demo-tab');

function renderView(name) {
  if (!content || !views[name]) return;
  content.innerHTML = views[name];
  tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.view === name));
}

tabs.forEach((tab) => tab.addEventListener('click', () => renderView(tab.dataset.view)));
renderView('overview');

const menuButton = document.querySelector('.menu-toggle');
const menu = document.querySelector('.primary-nav');
menuButton?.addEventListener('click', () => {
  const open = menu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
});
menu?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  menu.classList.remove('open');
  menuButton?.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const countObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const el = entry.target;
    const target = Number(el.dataset.count || 0);
    const startedAt = performance.now();
    const duration = 1100;
    const tick = (time) => {
      const progress = Math.min((time - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.round(target * eased).toLocaleString('pt-BR');
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    countObserver.unobserve(el);
  });
}, { threshold: .5 });
document.querySelectorAll('[data-count]').forEach((element) => countObserver.observe(element));

document.querySelector('#current-year').textContent = new Date().getFullYear();
