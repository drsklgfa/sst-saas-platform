# Operação de empresas — Checkpoint 3

Este módulo centraliza os cadastros usados pela consultoria antes de criar campanhas, vistorias e documentos.

## Dados cadastrais

A tela **Dados** permite corrigir razão social, nome fantasia, CNPJ, CNAE, grau de risco, quantidade de trabalhadores, responsável e situação da empresa. Alterações ficam registradas no histórico de auditoria.

## Estrutura ocupacional

A tela **Estrutura** organiza:

1. estabelecimento ou unidade;
2. setor;
3. GHE;
4. função;
5. posto de trabalho.

Os registros podem ser editados e arquivados. O arquivamento é lógico: o dado permanece ligado aos laudos e históricos antigos, mas deixa de aparecer como opção para novas campanhas e vistorias.

Uma referência enviada manualmente é aceita somente quando pertence à empresa atual. Isso impede que um identificador de outra empresa seja usado em setor, GHE, campanha ou vistoria.

## Contatos

A tela **Contatos** permite:

- contato principal;
- cargo;
- e-mail;
- telefone normalizado;
- WhatsApp;
- canal preferido;
- edição, arquivamento e reativação.

A definição de um novo contato principal retira automaticamente essa condição dos demais contatos da empresa.

## Serviços contratados

A tela **Serviços** é um controle interno da prestação de serviços. Ela não realiza cobrança automática.

Campos principais:

- código interno;
- serviço e categoria;
- situação;
- valor contratado;
- data de contratação e início;
- prazo e data de entrega;
- data de renovação;
- responsável;
- pedido ou contrato;
- observações.

O painel destaca prazos vencidos e renovações previstas para os próximos 30 dias. Os valores servem para administrar o faturamento externo da consultoria.

## Backup e restauração

Unidades, setores, GHEs, funções, postos, contatos e serviços fazem parte do backup portátil da empresa. Registros arquivados também são preservados.
