# Plataforma de Segurança e Saúde do Trabalho

Aplicação web privada e multiempresa para a operação de uma consultoria de SST. O objetivo é cadastrar empresas clientes, executar campanhas e avaliações, produzir documentos técnicos, acompanhar planos de ação e disponibilizar resultados ao RH.

> Estado desta cópia: **Checkpoint 9.3 — formatação oficial do schema no CI e continuidade da homologação**. Este checkpoint é completo e recuperável, mas ainda depende da execução do pipeline com dependências reais antes da homologação final.

## Base existente

- Autenticação própria com Argon2id e sessões no PostgreSQL.
- Estrutura multiempresa e perfis de consultoria/cliente.
- Empresas, estabelecimentos, setores, GHEs, funções e contatos.
- Campanhas públicas anônimas e questionário mobile-first.
- Portal permanente do RH.
- Documentos, versões, snapshots, PDF, DOCX e XLSX.
- Matriz de risco, NIOSH, RULA, REBA e consolidação psicossocial.
- Plano de ação 5W2H, evidências, mensagens e notificações.
- Armazenamento local ou S3 compatível.
- Backups portáteis e Worker com fila PostgreSQL.
- Docker, Docker Compose, Railway e GitHub Actions.

## Alterações consolidadas até o Checkpoint 9.3

- Correções de compilação, Prisma, seed, Docker e GitHub Actions do Checkpoint 1.
- Questionários versionados, campanhas agendadas, códigos anônimos, retomada e moderação do Checkpoint 4.
- Vistorias, evidências, NIOSH/RULA/REBA, inventário de riscos e plano 5W2H do Checkpoint 5.
- Modelos documentais versionados, snapshots imutáveis, auditoria pré-emissão, assinatura por revisão e liberação atômica do Checkpoint 6.
- Portal RH ampliado, central de mensagens, anexos, notas internas, notificações e comentários vinculados do Checkpoint 7.
- Retenção configurável, preservação legal, incidentes, auditoria, heartbeat do Worker e testes de integridade do Checkpoint 8.
- Typecheck offline gerado do schema, correções de transação/retenção, dependências de framework atualizadas e CI com smoke test real de Web e Worker do Checkpoint 9, a correção de renderização da central de mensagens do Checkpoint 9.1 a tentativa de formatação manual do Checkpoint 9.2 e a correção definitiva do Checkpoint 9.3, que executa o formatter oficial antes da validação.
- Permissões explícitas em todas as rotas internas de alteração.
- Perfis internos e do portal com política de menor privilégio.
- Administração da equipe interna com convite, suspensão e revogação de sessões.
- Administração dos acessos do RH com reativação e novo convite.
- Portal do cliente carrega somente documentos, ações, mensagens e evidências permitidos pelo perfil.
- Arquivos privados, backups e documentos oficiais possuem autorização contextual.
- Referências entre campanha/vistoria e GHE são validadas dentro da própria empresa.
- Dados cadastrais da empresa editáveis e auditados.
- Unidades, setores, GHEs, funções e postos com arquivamento lógico.
- Contatos editáveis, canal preferido e contato principal.
- Serviços contratados com valores, prazos, entregas e renovações.
- Painel com alertas comerciais e operacionais.
- Backup portátil atualizado para os novos cadastros.
- Total atual: 84 testes automatizados aprovados.

Consulte `CHANGELOG.md`, `VALIDATION_REPORT.md`, `docs/CI_AND_HOMOLOGATION.md`, `docs/DOCUMENTS.md`, `docs/COMMUNICATION.md` e `docs/SECURITY_OPERATIONS.md` para os detalhes e o estado real das validações.

## Início local

1. Copie `.env.example` para `.env`.
2. Substitua `AUTH_SECRET` e `FILE_ENCRYPTION_KEY` por valores aleatórios.
3. Preencha as variáveis `SEED_*` com os dados da sua consultoria e do administrador inicial.
4. Suba o PostgreSQL:

```bash
docker compose up -d postgres
```

5. Instale as dependências e prepare o banco:

```bash
npm install
npm run preflight
npm run preflight:seed
npm run db:deploy
npm run db:seed
```

6. Inicie Web e Worker em terminais separados:

```bash
npm run dev
npm run worker
```

7. Acesse `http://localhost:3000` e entre com o e-mail e a senha definidos em `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

## Railway

Use quatro componentes no mesmo projeto:

- PostgreSQL;
- Web usando o `Dockerfile` sem Start Command personalizado;
- Worker usando a mesma imagem e o comando `npm run worker`;
- Bucket privado S3 compatível.

No Web, mantenha `RUN_DB_SCHEMA_SYNC=true` e use `/railway.web.toml`. No Worker, use `RUN_DB_SCHEMA_SYNC=false` e `/railway.worker.toml`.
Defina `APP_URL` com o domínio público HTTPS do serviço Web. Redirecionamentos de autenticação e formulários usam essa origem canônica e nunca devem apontar para `0.0.0.0`, `localhost` ou a porta interna do contêiner.

O seed deve ser executado uma única vez no shell do serviço Web, após configurar as variáveis `SEED_*`.

Consulte `docs/RAILWAY.md` para o roteiro completo.

## Segurança operacional

- Nunca publique `.env`, chaves, senhas ou credenciais do Bucket.
- Não reutilize a chave de exemplo de `.env.example` em produção.
- Use armazenamento S3 privado em produção.
- Mantenha IA e e-mail externos desativados enquanto não estiverem configurados.
- Cadastre empresas reais somente depois que a versão final passar por toda a validação e pelo teste de aceitação.

## Estrutura

- `src/app`: páginas e APIs;
- `src/domain`: regras técnicas, relatórios e backups;
- `src/lib`: autenticação, banco, storage, integrações e utilitários;
- `src/worker`: fila e processadores;
- `prisma`: schema e seed;
- `tests`: testes automatizados;
- `docker`: inicialização da imagem;
- `docs`: implantação e operação.
