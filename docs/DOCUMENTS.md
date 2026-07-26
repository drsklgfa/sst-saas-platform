# Documentos, revisões e emissão

## Princípio de integridade

Cada documento possui revisões independentes. O conteúdo pode ser alterado somente enquanto a revisão está em `DRAFT` ou `REVIEW` e ainda não possui snapshot. A primeira solicitação de prévia congela a própria revisão atual; ela não cria uma revisão artificial.

O snapshot guarda os dados usados naquela emissão — empresa, estrutura, riscos, ações, campanhas, vistorias, cálculos, modelo e seções — e recebe um hash SHA-256 canônico. PDF, DOCX e XLSX são produzidos a partir desse snapshot, não de consultas posteriores ao cadastro vivo.

## Fluxo recomendado

1. Crie o documento e escolha um modelo publicado.
2. Edite as seções enquanto a revisão estiver em rascunho.
3. Gere a prévia. A revisão será congelada e a prévia terá marca d'água.
4. Execute a auditoria pré-emissão e trate avisos ou registre justificativa técnica.
5. Registre as aprovações internas ou envie um PDF assinado externamente.
6. Solicite a emissão. O Worker gera o PDF oficial.
7. A troca da revisão liberada ocorre de forma atômica: a revisão anterior continua disponível ao RH até o novo PDF, hash e assinaturas serem confirmados.
8. Para alterar conteúdo congelado ou emitido, crie uma nova revisão.

## Estados principais

- `DRAFT`: conteúdo editável.
- `REVIEW`: conteúdo editável em revisão.
- `PREVIEW`: snapshot congelado e prévia disponível.
- `WAITING_SIGNATURE`: aguardando aprovações ou assinatura.
- `WAITING_DOCUMENTS`: geração oficial em processamento; nova revisão fica bloqueada.
- `ISSUED_UNSIGNED`: emitido sem assinatura registrada.
- `ISSUED_SIGNED`: emitido com uma ou mais assinaturas.
- `REPLACED`, `CANCELLED`, `ARCHIVED`: estados terminais e imutáveis.

## Modelos documentais

A área **Configurações → Modelos** permite criar modelos por tipo de documento. Versões em rascunho podem ser editadas; versões publicadas são imutáveis. Uma atualização do padrão cria nova versão sem alterar documentos antigos.

As seções possuem código, título, posição e HTML-base. O sistema combina esse conteúdo com tabelas automáticas do snapshot, como identificação, inventário de riscos, cálculos, participação e plano de ação.

## Auditoria pré-emissão

A auditoria verifica, conforme o tipo do documento:

- identificação da empresa e estabelecimento;
- quantidade e conteúdo das seções;
- inventário de riscos;
- riscos altos ou críticos sem ação;
- ações sem responsável ou prazo;
- aprovações técnicas;
- cálculos ergonômicos em AEP/AET;
- caracterização por GHE em LTCAT;
- inventário e plano de ação em PGR.

Avisos não são apagados. Pendências críticas exigem justificativa técnica antes da emissão, preservada na revisão e na auditoria.

## Assinaturas

Cada assinatura pertence à revisão exata e registra nome, registro profissional, função, método, data, hash do documento e usuário responsável. Uma assinatura antiga nunca vale automaticamente para uma revisão futura.

O upload de PDF assinado externamente permanece privado até a liberação. Para ser oficial, o arquivo precisa corresponder ao hash do snapshot e à quantidade de assinaturas da revisão.

## Arquivos

- `PDF_PREVIEW`: prévia com marca d'água, privada.
- `PDF`: PDF oficial gerado pelo sistema.
- `PDF_SIGNED`: PDF assinado externamente.
- `DOCX_EDITABLE`: cópia editável, sem valor oficial.
- `XLSX_DATA`: inventário e plano de ação em planilha.

A geração de uma nova revisão não remove a anterior. A última revisão liberada continua acessível no portal até que a nova emissão seja concluída integralmente.

## Verificação pública

Cada documento possui código público de verificação. A página exibe somente metadados essenciais: empresa, tipo, revisão liberada, situação, responsáveis, data e hashes. Conteúdo técnico, anexos e respostas psicossociais não são expostos.

## Backup e restauração

O backup portátil versão 7 preserva documentos, revisões, snapshots, hashes, auditorias, assinaturas e arquivos. Na restauração, IDs são remapeados e um novo código público de verificação é criado, evitando colisões com outra instalação.
