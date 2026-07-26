# Campanhas e questionários

## Fluxo recomendado

1. Crie um questionário em **Questionários**.
2. Adicione perguntas, opções, dimensões e condições.
3. Publique a versão. Uma versão publicada é imutável.
4. Para alterar, crie uma nova versão a partir da anterior.
5. Na empresa, crie a campanha e selecione os questionários publicados.
6. Escolha campanha geral ou os GHEs participantes.
7. Configure abertura, encerramento e grupos mínimos.
8. Quando usar códigos, gere o CSV e distribua um código por participante.
9. Acompanhe adesão, alertas de qualidade e moderação na página da campanha.

## Anonimato

A pesquisa pública não solicita nome, CPF, matrícula, telefone ou e-mail. O navegador recebe um identificador aleatório local específico da campanha para reduzir respostas duplicadas. O servidor armazena apenas o hash desse identificador, sem IP bruto.

O rate limit usa o endereço de rede somente em memória para proteção temporária. Esse endereço não é gravado na resposta.

Códigos de uso único são mostrados somente no CSV gerado. O banco armazena o hash. Backups não exportam códigos reaproveitáveis; após restauração, gere uma nova lista.

## Grupos mínimos

Resultados consolidados são suprimidos até que a quantidade de respostas incluídas alcance o mínimo configurado. A exclusão de uma resposta não apaga o registro original e exige justificativa auditada.

## Condições

Condições são uma lista JSON. Exemplo:

```json
[
  {
    "questionCode": "tem_dor",
    "operator": "equals",
    "value": "YES"
  }
]
```

Operadores: `equals`, `notEquals`, `includes`, `notIncludes`, `answered` e `notAnswered`.

## Agendamento

As datas escolhidas no navegador são convertidas para UTC antes do envio. O Worker verifica as campanhas a cada minuto e registra abertura ou encerramento automático na auditoria.
