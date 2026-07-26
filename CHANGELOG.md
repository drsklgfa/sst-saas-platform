# Changelog

## 1.1.0-checkpoint.9.7

- Corrige a inicialização do Worker na imagem Docker.
- Inclui `tsconfig.json` no runtime para resolução dos imports `@/...`.
- Move `tsx` para dependência de produção e usa `npm run worker`.
- Adiciona verificações do runtime do Worker durante o Docker build.
- Torna o comando iniciado pelo entrypoint visível nos logs.

## 1.1.0-checkpoint.9.4

### Corrigido

- O componente compartilhado `Button` agora aceita variantes tipadas (`primary`, `secondary`, `outline`, `danger` e `ghost`).
- A propriedade `variant` é consumida pelo componente e não é repassada ao elemento HTML nativo.
- Corrigido o erro real de TypeScript na página `/settings/security`: `Property 'variant' does not exist on type ButtonHTMLAttributes<HTMLButtonElement>`.
- Mantido `secondary` para a ação de limpeza operacional, com apresentação visual própria.

### Validação

- Typecheck offline aprovado.
- Adicionados dois testes de regressão para o contrato do `Button` e seu uso na página de segurança.
- Total local atual: 87 testes aprovados.

## 1.1.0-checkpoint.9.3

- Corrigida definitivamente a repetição da falha em `prisma format --check`.
- O GitHub Actions agora executa o formatter oficial (`npx prisma format`) e imediatamente confirma o resultado com `npx prisma format --check`.
- `prisma validate` e `prisma generate` continuam obrigatórios; nenhuma verificação foi pulada.
- Adicionado o script `npm run db:format`.
- Adicionado teste de regressão que exige a ordem `format → format --check → validate → generate` no CI.

## 1.1.0-checkpoint.9.2

### Corrigido

- `prisma/schema.prisma` formatado segundo o padrão canônico do Prisma.
- Adicionados espaçamentos entre blocos, alinhamento dos campos e normalização dos argumentos de relações e índices.
- Corrigida a falha do GitHub Actions em `npx prisma format --check`.
- Mantidas integralmente as correções e funcionalidades dos checkpoints anteriores.

### Validação

- Validação estrutural do schema aprovada.
- Typecheck offline aprovado.
- Testes e preflights repetidos sobre a cópia completa.

## 1.1.0-checkpoint.9.1

### Corrigido

- A central de mensagens agora tipa explicitamente o mapa de responsáveis como `Map<string, string>`.
- O nome do responsável é normalizado por uma função que sempre retorna texto compatível com `ReactNode`.
- Corrigido o erro `TS2322: Type '{}' is not assignable to type 'ReactNode'` encontrado pelo GitHub Actions.
- Adicionado teste de regressão para impedir o retorno da expressão não tipada no JSX.

### Validação

- `npm run typecheck:offline`: aprovado.
- `npm run verify:offline`: aprovado.
- Total local atual: 83 testes aprovados.

## 1.1.0-checkpoint.9

### Validação TypeScript reforçada

- Gerador local de tipagens Prisma offline derivado diretamente do `schema.prisma`.
- Novo comando `npm run typecheck:offline`, sem contaminar o typecheck real de produção.
- Correção do retorno da transação de evidência do portal RH.
- Tipagem explícita do resultado da retenção agendada.
- Testes de regressão para impedir o retorno desses erros.

### Dependências e compilação

- Next.js atualizado dentro da linha 15 para `15.5.20`.
- React e React DOM atualizados dentro da linha 19.1 para `19.1.8`.
- Tipos de React DOM alinhados à linha 19.1.
- O typecheck real com Prisma Client continua obrigatório e separado da validação offline.

### CI e homologação

- Pipeline ampliado para doze etapas.
- Retentativas e tempos de espera do npm configurados.
- Cache do build Next.js.
- `prisma format --check`, `validate` e `generate`.
- Banco PostgreSQL e seed de teste.
- Typecheck real, testes e build.
- Construção da imagem Docker.
- Inicialização do Web e Worker usando a própria imagem.
- Endpoint de saúde e heartbeat do Worker obrigatórios para aprovação.
- Concorrência configurada para cancelar execuções antigas da mesma branch.

### Testes

- Total local atual: 82 testes aprovados.

## 1.1.0-checkpoint.8

### Segurança e governança

- Política de retenção por consultoria com prazos mínimos e preservação legal.
- Limpeza automática limitada a sessões expiradas, notificações lidas, jobs concluídos e convites expirados.
- Exclusão de auditoria desativada por padrão e incompatível com preservação legal.
- Registro de incidentes com gravidade, responsável, situação, datas e histórico de ações.
- Permissões próprias para auditoria, segurança e saúde do sistema.

### Observabilidade e recuperação

- Heartbeat do Worker a cada 30 segundos.
- Painel de saúde com banco, Worker, armazenamento, fila, incidentes e último backup.
- Testes assíncronos de integridade para backups, incluindo manifesto, checksums internos e SHA-256 do arquivo.
- Senhas de backups removidas do payload do job após conclusão ou falha definitiva.
- Endpoint de saúde sem cache e com estado resumido do Worker.

### Proteções adicionais

- Bloqueio de mutações cross-site usando Origin e Fetch Metadata.
- HSTS em produção e novos cabeçalhos de isolamento e política de domínio.
- Tela de auditoria com busca, filtros, paginação e comparação antes/depois.
- Backup portátil versão 8 inclui política, incidentes, integrações sem segredos e auditoria.
- Total local atual: 77 testes aprovados.

## 1.1.0-checkpoint.7

### Portal RH e comunicação

- Central de conversas com assunto, categoria, prioridade, situação, responsável e participantes.
- Distribuição automática para o integrante elegível com menor carga de conversas abertas.
- Mensagens com anexos, confirmação de leitura e notas internas invisíveis ao cliente.
- Estados de nova, em atendimento, aguardando empresa, aguardando consultoria, resolvida, arquivada e reaberta.
- Portal RH recebe somente conversas, comentários, arquivos e notificações permitidos pelo perfil.

### Notificações e acompanhamento

- Central de notificações interna e no portal, com leitura individual e em lote.
- Alertas para novas mensagens, atribuições, mudanças de situação, documentos liberados, ações atualizadas e evidências enviadas ou revisadas.
- Destinatários filtrados por empresa, participação, permissão e preferência de silenciamento.
- Links das notificações direcionam corretamente para o painel interno ou para o portal.

### Comentários, evidências e arquivos

- Comentários vinculados a ações, evidências, documentos e riscos.
- Visibilidade interna ou compartilhada com o cliente, com anexos e auditoria.
- Arquivos internos de comunicação protegidos por permissão; o RH não acessa notas ou anexos privados.
- Atualizações do 5W2H e revisões de evidência geram histórico e avisos operacionais.

### Portabilidade e testes

- Backup portátil versão 7 preserva conversas, participantes, mensagens, anexos, comentários, notificações relacionadas e linha do tempo.
- Restauração remapeia usuários, entidades e arquivos sem reutilizar IDs antigos.
- Total local atual: 69 testes aprovados.

## 1.1.0-checkpoint.6

### Modelos e revisões

- Modelos documentais administráveis por tipo, com rascunho editável, publicação imutável e nova versão baseada na anterior.
- Documento passa a controlar revisão atual, revisão liberada e código público de verificação.
- A primeira prévia congela a revisão corrente sem criar uma revisão artificial.
- Revisões congeladas ou emitidas não aceitam alteração de seções; mudanças exigem nova revisão.

### Snapshot, auditoria e integridade

- Snapshot canônico com hash SHA-256 reúne empresa, estrutura, campanhas, riscos, ações, vistorias, cálculos, modelo e seções.
- PDF, DOCX e XLSX são gerados exclusivamente do snapshot imutável.
- Auditoria pré-emissão registra verificações, avisos, erros e justificativa técnica.
- Página pública de verificação mostra somente metadados, revisão, responsáveis e hashes.

### Assinatura e emissão

- Assinaturas e PDFs externos vinculados à revisão e ao hash exatos.
- Prévia com marca d'água separada do PDF oficial.
- Emissão valida integridade do snapshot e quantidade de assinaturas.
- Liberação atômica mantém o último PDF oficial disponível até a nova revisão ser produzida e validada.
- Arquivo de uma revisão não liberada não pode ser acessado pelo portal, mesmo com a URL.

### Portabilidade e testes

- Backup portátil versão 6 preserva snapshots, auditorias, assinaturas, arquivos e vínculos de revisão.
- Restauração remapeia IDs e cria novo código público de verificação.
- Total local atual: 60 testes aprovados.

## 1.1.0-checkpoint.5

### Vistorias e evidências de campo

- Caracterização da atividade, ambiente, organização do trabalho, participantes e trabalhadores observados.
- Checklist técnico por categoria, código, resultado, observação, recomendação e criticidade.
- Fotos, documentos e medições vinculados à vistoria com legenda e arquivo privado.
- Estados de rascunho, andamento, conclusão e revisão; vistoria revisada fica imutável e exige justificativa para reabertura.

### Métodos e memória de cálculo

- NIOSH ampliado com multiplicador de duração e validação de faixas.
- RULA e REBA com limites de entrada e memória de cálculo persistida.
- Todos os cálculos são auditados e vinculados à metodologia e versão do motor.

### Inventário de riscos

- Cadastro e edição de riscos por empresa, GHE e vistoria de origem.
- Matriz 5x5 com severidade, probabilidade e exposição.
- Avaliação inicial e residual, eficácia dos controles, expostos, frequência, duração, metodologia, controles e referências.
- Revisões, arquivamento lógico e indicadores de riscos altos/críticos sem ação vinculada.

### Plano de ação 5W2H

- Planos anuais e ações vinculadas ao risco.
- Responsável, verificador, prazo, prioridade, local, motivo, método, custos e progresso.
- Evidências do cliente e da consultoria, revisão técnica, rejeição justificada e aprovação.
- Verificação de eficácia, risco residual, motivo de atraso e próxima revisão.
- Worker marca automaticamente ações vencidas e registra auditoria.

### Backup e testes

- Backup portátil versão 5 com evidências da vistoria, vínculos de riscos e campos ampliados do 5W2H.
- Restauração remapeia arquivos, vistorias, riscos, ações e evidências sem colisão de IDs.
- Total local atual: 51 testes aprovados.

## 1.1.0-checkpoint.4

### Questionários versionados

- Cadastro de questionários e criação de rascunhos.
- Perguntas com tipos, opções, dimensões, escalas, posição e condições.
- Publicação imutável e clonagem para nova versão.
- Validação de opções, códigos condicionais e tipos não suportados.

### Campanhas e participação anônima

- Campanhas gerais ou segmentadas por múltiplos GHEs.
- Vários questionários publicados por campanha.
- Abertura e encerramento programados no horário do navegador.
- Worker sincroniza abertura e encerramento automaticamente com auditoria.
- Links e QR Codes próprios por GHE.
- Códigos anônimos de uso único exportados apenas em CSV; o banco armazena somente hashes.
- Bloqueio de duplicidade por navegador e campanha sem armazenar IP bruto.
- Validação servidor de perguntas obrigatórias, opções, números, datas e condições.
- Salvamento automático e retomada no navegador.
- Alertas de conclusão rápida e repetição extensa.

### Moderação e privacidade

- Moderação auditável com inclusão e exclusão da consolidação.
- Justificativa obrigatória para excluir resposta.
- Supressão de resultados abaixo do grupo mínimo.
- Consolidação psicossocial somente com respostas incluídas.
- Backup portátil versão 4 sem exportar códigos reutilizáveis.
- Após restauração, campanhas com códigos exigem nova geração.
- Validador do schema passou a detectar valores duplicados em enums.

### Testes

- Testes de agendamento, condições, validação, qualidade, anonimato, backup e scheduler.
- Total local atual: 43 testes aprovados.

## 1.1.0-checkpoint.3

### Empresas e cadastros operacionais

- Edição auditada dos dados cadastrais e da situação da empresa.
- Unidades, setores, GHEs, funções e postos com edição e arquivamento lógico.
- Registros arquivados permanecem nos históricos, mas não podem ser usados em novos fluxos.
- Validação da cadeia empresa → unidade → setor → GHE.
- Contatos com edição, canal preferido, contato principal, arquivamento e reativação.

### Serviços e controle comercial

- Novo cadastro de serviços contratados, sem gateway de pagamento.
- Valor, contratação, início, prazo, entrega, renovação, responsável e pedido/contrato.
- Estados de proposta, contratado, execução, espera, entrega, conclusão, suspensão, cancelamento e vencimento.
- Alertas no painel para serviços atrasados e renovações em 30 dias.

### Portabilidade e testes

- Backup portátil atualizado para incluir serviços e estados ativos/arquivados.
- Formato do backup ampliado para versão 3.
- Testes de moeda, datas, atividades, schema operacional, autorização e portabilidade.
- Total local atual: 29 testes aprovados.

## 1.1.0-checkpoint.2

### Autenticação e sessões

- Redirecionamento após login e ativação conforme o usuário seja interno ou do portal.
- Limpeza de sessões expiradas e limite de dez sessões por usuário.
- Suspensão de acessos encerra sessões existentes.
- Convites internos e empresariais expiram em 72 horas e invalidam convites pendentes anteriores.

### Permissões e isolamento

- Permissões explícitas em todas as rotas internas mutáveis.
- Perfis internos e empresariais tipados e testados.
- Interface oculta ações não autorizadas.
- Portal consulta somente recursos permitidos por perfil.
- Proteção contextual de arquivos, backups, documentos oficiais e evidências.
- Campanhas e vistorias validam se o GHE pertence à empresa.

### Administração de acessos

- Nova área de equipe interna em `/settings/users`.
- Convite, suspensão, reativação e novo convite para integrantes.
- Acessos do RH agora podem ser suspensos, reativados e convidados novamente.
- Auditoria das alterações de vínculo.

### Testes

- Matriz RBAC interna e do portal.
- Verificação automática de autorização nas rotas mutáveis.
- Total local atual: 24 testes aprovados.

## 1.1.0-checkpoint.1

### Corrigido

- Schema Prisma já permanece no formato aceito pelo Prisma 6.
- Tipagem de `unzipper` e fluxos de restauração preservados da versão 1.0.2.
- Separação entre utilitários client e `node:crypto` preservada.
- Campos JSON do Prisma agora usam `toPrismaJson` e `toPrismaNullableJson`.
- `audit`, fila, snapshots, seções e resultado do Worker deixaram de enviar `unknown` diretamente ao Prisma.
- O provider S3 voltou a implementar integralmente a interface, incluindo `exists`.
- `S3_FORCE_PATH_STYLE` agora é convertido para booleano real.

### Segurança e configuração

- Seed sem credenciais fixas de demonstração.
- Credenciais demonstrativas removidas da tela de login.
- Administrador e consultoria inicial definidos por variáveis `SEED_*`.
- Senha inicial mínima de 12 caracteres.
- Validação condicional para S3, Gemini e Resend.
- Web e Worker usam controle explícito de sincronização do schema.

### Infraestrutura

- GitHub Actions organizado em dez etapas.
- CI agora cria o banco, executa seed, typecheck, testes, build e Docker build.
- Docker usa entrypoint próprio e evita sincronização duplicada pelo Worker.
- Documentação e `.env.example` atualizados.

### Testes

- Testes de normalização JSON.
- Testes positivos e negativos dos preflights.
- Total local atual: 18 testes aprovados.

## 1.1.0-checkpoint.9.5

### Runtime Docker e healthcheck

- O servidor Next.js standalone agora recebe `HOSTNAME=0.0.0.0` na imagem final e na homologação.
- O teste Docker deixou de depender de `--network host` e do PostgreSQL externo do runner.
- A homologação cria uma rede Docker isolada e um PostgreSQL 16 próprio.
- O Web publica explicitamente a porta `3000:3000` e aplica o schema antes do healthcheck.
- O Worker inicia somente depois de Web e banco estarem saudáveis.
- O teste detecta encerramento prematuro dos contêineres Web e Worker.
- Em caso de falha, o CI mostra o último status HTTP, corpo da resposta, inspect e logs dos três contêineres.
- Foram adicionados testes de regressão para bind, rede Docker, PostgreSQL e diagnóstico.
- Total local atual: 90 testes aprovados.

## 1.1.0-checkpoint.9.6

### Prisma no runtime Docker

- O Prisma Client agora é gerado com `binaryTargets = ["native", "debian-openssl-3.0.x"]`.
- Os estágios `deps`, `builder` e `runner` instalam OpenSSL explicitamente.
- O Docker build confirma a presença de `libquery_engine-debian-openssl-3.0.x.so.node` antes de criar a imagem final.
- Corrige o healthcheck 503 causado pela ausência do Query Engine compatível com Debian Bookworm/OpenSSL 3.
- Foram adicionados testes de regressão para o target do Prisma, OpenSSL e presença do engine.
- Total local atual: 92 testes aprovados.

## 1.1.0-checkpoint.9.8

### Preparação para Railway

- O `railway.toml` compartilhado deixou de impor healthcheck HTTP a todos os serviços.
- Adicionados `railway.web.toml` e `railway.worker.toml` com configurações próprias.
- Web mantém `/api/health`; Worker não recebe domínio nem healthcheck HTTP.
- Worker inicia pelo entrypoint da imagem com `npm run worker`, preservando `RUN_DB_SCHEMA_SYNC=false`.
- Documentação de Railway atualizada para Web, Worker, PostgreSQL, Bucket, variáveis, seed e testes de homologação.
- Total local previsto: 98 testes aprovados.

## 1.1.0-checkpoint.9.9

### Compatibilidade do Worker na Railway

- A política de reinício do Worker mudou de `ALWAYS` para `ON_FAILURE`.
- Definido limite de 10 reinícios automáticos após falhas.
- Corrige a inicialização em contas Railway Free/trial, nas quais `ALWAYS` não está disponível.
- O processo continua persistente e só deixa de reiniciar quando encerra normalmente.
- Adicionado teste de regressão da política de implantação.
- Total local previsto: 99 testes aprovados.

## Checkpoint 9.10

- Inclui `scripts/` na imagem final Docker para permitir `npm run preflight:seed` via Railway SSH.
- Faz o build falhar se `preflight-seed.mjs` ou `prisma/seed.ts` não estiverem no runtime.

## 1.1.0-checkpoint.9.11

- Corrige redirecionamentos que usavam o endereço interno do contêiner (`0.0.0.0:8080`) no Railway.
- Login, logout, ativação e rotas de formulário passam a usar `APP_URL` como origem pública canônica.
- Middleware usa `APP_URL` para encaminhar usuários não autenticados à tela de login.
- Adiciona testes de regressão para impedir redirects públicos baseados em `request.url`.
