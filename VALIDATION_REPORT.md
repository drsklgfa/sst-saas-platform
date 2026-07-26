# Relatório de validação — Checkpoint 9.11

Versão: `1.1.0-checkpoint.9.11`

## Objetivo

Corrigir URLs de redirecionamento em produção atrás do proxy do Railway. O endereço interno do contêiner (`0.0.0.0:8080`) não pode ser usado como origem pública após login ou envio de formulários.

## Correções aplicadas

- helper central `publicAppUrl()` baseado em `APP_URL`;
- login e logout redirecionam para o domínio público configurado;
- ativação, notificações, cadastros, documentos, inspeções e demais formulários deixam de derivar origem de `request.url`;
- middleware usa `APP_URL` no redirecionamento para `/login`;
- proteção para aceitar apenas caminhos internos iniciados por `/`;
- testes de regressão cobrindo login, middleware e todas as API routes.

## Validações executadas

- 248 arquivos validados estruturalmente;
- validação do schema Prisma;
- typecheck offline;
- preflight da aplicação;
- preflight do seed;
- suíte de 104 testes aprovada;
- pesquisa global confirmando ausência de redirects baseados no host interno.

## Barreira real

O novo commit deve passar pelo GitHub Actions e pelo deploy automático do Railway antes de ser considerado homologado. O usuário pode acessar manualmente o domínio público seguido de `/dashboard` na versão anterior porque a sessão de login já foi criada.
