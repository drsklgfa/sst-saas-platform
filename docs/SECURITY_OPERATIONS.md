# Segurança, retenção e recuperação

## Objetivo

Este módulo centraliza controles operacionais que não devem depender da memória do administrador: preservação legal, limpeza de dados temporários, incidentes, saúde do Worker, fila de processamento e testes de integridade dos backups.

## Retenção

A rotina automática atua somente sobre dados operacionais temporários:

- sessões já expiradas;
- notificações já lidas;
- jobs concluídos ou cancelados;
- convites usados ou expirados;
- logs de auditoria somente quando a exclusão estiver explicitamente habilitada.

Ela não apaga empresas, campanhas, respostas, vistorias, riscos, documentos, ações, evidências ou arquivos técnicos.

A opção **Preservação legal** suspende toda limpeza automática. Use-a durante fiscalização, litígio, investigação, incidente ou ordem de preservação.

## Auditoria

A página `/settings/audit` permite filtrar eventos por empresa, ação, entidade ou identificador. Os registros exibem valores anteriores, posteriores e metadados da operação.

## Incidentes

A página `/settings/security` registra incidentes com gravidade e situação. Toda atualização pode receber uma nota de ação tomada e fica registrada na auditoria.

## Saúde do sistema

A página `/settings/system` apresenta:

- conectividade com o banco;
- último heartbeat do Worker;
- disponibilidade do armazenamento;
- jobs aguardando, executando ou com falha;
- incidentes em aberto;
- último backup concluído;
- testes de recuperação recentes.

O Worker atualiza seu heartbeat a cada 30 segundos. Ausência superior a dois minutos aparece como `STALE`.

## Teste de backup

Na tela de backups, use **Testar integridade**. O Worker:

1. lê o arquivo no armazenamento;
2. confere o SHA-256 do objeto;
3. abre o backup;
4. valida o manifesto;
5. compara os checksums internos;
6. grava o resultado em `RecoveryTest`.

Para backups protegidos, a senha é usada apenas durante o job. Depois da conclusão ou falha definitiva, o payload sensível é substituído por um marcador sem senha.

O teste de integridade não substitui um ensaio periódico de restauração em ambiente separado.

## Rotina recomendada

- diariamente: conferir painel e jobs com falha;
- semanalmente: gerar backup completo e testar integridade;
- mensalmente: restaurar uma cópia em ambiente de teste;
- antes de atualizações: gerar backup completo e validar;
- após incidente: ativar preservação legal e registrar todas as ações.
