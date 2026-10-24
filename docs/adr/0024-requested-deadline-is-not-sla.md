---
status: aceito
---

# O prazo desejado não é o SLA

O legado calcula o atraso da fila e do dashboard comparando `operational.desiredDeadline` com a data atual. Esse campo é a resposta **“Prazo desejado”**, escolhida pelo solicitante na abertura — uma expectativa, não um compromisso da equipe. O cálculo trata a expectativa como se fosse o prazo de atendimento, e o resultado contradiz a proposta de SLA do produto.

A proposta de SLA do produto define outra coisa: prazo por **etapa** (Triagem, Mapeamento, Homologação) e por **prioridade**, contado em horas úteis, pausado em `Pendente de informações`, retomado preservando o tempo consumido e encerrado nos status terminais. Nada disso existe no modelo. A issue #32 do repositório de produto registra a origem do documento; ela foi encerrada com o documento **entregue**, não com a regra aprovada, e a referência é o conteúdo da proposta, não o caminho do arquivo.

`requests.estimated_completion` é a previsão publicada pela equipe, e não um SLA — e o legado não tem rota que a escreva.

Decidimos que **o prazo desejado não é fonte de atraso nem de SLA**. Ele continua sendo uma resposta do formulário, exibida como contexto do solicitante; a fila e o dashboard não derivam `overdue` dele. O SLA por etapa e prioridade entra quando a regra de produto for aprovada, com modelo próprio. `estimated_completion` continua previsão, e seu escritor é pendência. Se o produto quiser um sinal provisório, ele se chama **“prazo desejado vencido”**, não “atraso”.

## Alternativas consideradas

- **Manter o cálculo do legado.** Simples, mas marca como atrasada uma solicitação que a equipe nunca prometeu atender naquela data, e viola as regras de pausa, horas úteis e etapa da proposta de SLA.
- **Usar `estimated_completion` como SLA.** A previsão é uma estimativa publicada, não um compromisso por etapa/prioridade; e o campo não tem escritor no legado.
- **Implementar o SLA agora.** As regras estão em revisão e dependem de validação com o cliente; transformá-las em schema normativo antes disso seria prematuro.

## Consequências

- `overdue` da fila e do dashboard fica **indefinido** até a regra de SLA existir; a fila pode mostrar o prazo desejado como contexto, nunca como atraso.
- `queue.overdueRequests`, `dashboard.overdue` e o recorte `situation=overdue` não têm semântica válida enquanto isso — a matriz de contratos registra a pendência.
- `operational.desiredDeadline` permanece no formulário; quando o formulário configurável entrar, ele pode deixar de existir, e nada operacional pode depender dele.
- O SLA, quando chegar, precisa de política por etapa/prioridade, calendário de horas úteis, pausa/retomada e histórico — ver §21 de [`03-Data-Model.md`](../03-Data-Model.md).
