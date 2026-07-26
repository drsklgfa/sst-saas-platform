# Vistorias, inventário de riscos e plano 5W2H

## Fluxo recomendado

1. Cadastre ou revise a estrutura da empresa, incluindo unidade, setor e GHE.
2. Crie a vistoria a partir da página da empresa.
3. Registre a atividade, o ambiente, a organização do trabalho e os participantes.
4. Inclua itens do checklist, fotos, medições e documentos com legendas objetivas.
5. Execute NIOSH, RULA ou REBA quando aplicável e confira a memória de cálculo.
6. Conclua a vistoria e, depois da revisão técnica, marque-a como revisada.
7. Cadastre os perigos e fatores no inventário, vinculando o GHE e a vistoria de origem.
8. Avalie risco inicial e residual pela matriz severidade × probabilidade × exposição.
9. Para riscos que exigem tratamento, crie ou selecione um plano 5W2H e vincule a ação ao risco.
10. O RH atualiza andamento e envia evidências pelo portal; a consultoria valida e avalia eficácia.

## Imutabilidade

Uma vistoria marcada como `REVIEWED` não aceita alteração de dados, itens, anexos ou cálculos. Para reabri-la, selecione outro estado e informe uma justificativa, que ficará registrada na auditoria.

## Evidências

- Vistorias aceitam fotos JPG/PNG/WebP, PDF, CSV e XLSX, até 20 MB por arquivo.
- Evidências da vistoria são privadas da consultoria.
- Evidências de ações podem ser compartilhadas com o portal da empresa conforme o perfil.
- Todo arquivo recebe hash SHA-256, vínculo com tenant/empresa e controle de acesso.

## Matriz de risco

A classificação usa três entradas de 1 a 5:

- Severidade;
- Probabilidade;
- Exposição.

O resultado é classificado em muito baixo, baixo, moderado, alto ou crítico. A avaliação residual é opcional e deve representar o cenário após controles.

## Plano 5W2H

Cada ação contém, quando aplicável:

- O que será feito;
- Por que;
- Onde;
- Responsável;
- Verificador;
- Prazo;
- Como;
- Custo previsto e real;
- Progresso;
- Evidências;
- Resultado da eficácia;
- Risco residual;
- Próxima revisão.

O Worker verifica prazos a cada minuto e muda ações vencidas para `OVERDUE`, sem apagar o status anterior da auditoria.
