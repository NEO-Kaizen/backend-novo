---
status: aceito
---

# O e-mail do solicitante é chave de busca, não autenticação

O portal público deixa uma pessoa abrir uma solicitação sem conta e acompanhá-la depois pelo protocolo. Para isso a requisição precisa de um ator, e o ator precisa de alguma identidade — mas o `CODING_STANDARDS.md` § 8 proíbe confiar em identidade enviada pelo cliente, e não há sessão para quem não tem conta.

O [ADR-0013](./0013-requester-is-an-answer-not-a-table.md) já decidiu que o solicitante é **resposta do formulário**, não tabela. Qualquer solução que guarde credencial de acompanhamento recriaria a tabela que aquele ADR removeu.

Decidimos que o solicitante se identifica pelo header `X-Requester-Email`, e que esse header é **chave de busca, não autenticação**: ele não prova identidade e não autoriza nada por si. O serviço só libera o acompanhamento quando o e-mail declarado confere com a resposta `corporate_email` da **própria** solicitação (trim e comparação case-insensitive). Sem correspondência, a resposta é `404`, nunca `403` — `403` confirmaria que o protocolo existe. O nome exibido vem da resposta gravada, nunca do cliente. O header vale só no modo `PUBLIC`; no modo `AUTHENTICATED` ele é ignorado, porque a sessão é a identidade. O endpoint público tem rate limit por IP e por protocolo ([ADR-0008](./0008-protocol-without-collision-risk.md)).

## Alternativas consideradas

- **Token opaco de acompanhamento (cookie ou URL assinada).** Daria uma credencial real, mas exige guardar o token e o vínculo com a solicitação — a tabela que o ADR-0013 removeu — e quebra o uso descrito pelo produto: colar o protocolo em qualquer navegador e continuar.
- **Exigir conta para acompanhar.** Fecha a porta pública que o [ADR-0018](./0018-portal-read-has-two-doors.md) desenhou e transforma o acompanhamento anônimo em cadastro.
- **Confiar no nome e no e-mail declarados.** É o que o legado fazia: qualquer pessoa que soubesse um protocolo lia a solicitação inteira. Rejeitado pelo `CODING_STANDARDS.md` § 8.

## Consequências

- Não há tabela nova: a conferência usa `form_answers.value_lookup`, a projeção normalizada e indexada da resposta `email`; `value_text` continua sendo o valor autoritativo. O índice fica curto o bastante para não esbarrar no limite de B-tree nem no prefixo exigido pelo MySQL para `TEXT`.
- A defesa contra enumeração é operacional, não criptográfica: rate limit, conhecimento do e-mail e `404` no lugar de `403`. Os 40 bits do protocolo continuam varregáveis ([ADR-0008](./0008-protocol-without-collision-risk.md)).
- O solicitante autenticado não usa o header: o `requester_user_id` da solicitação é a referência.
- O e-mail declarado nunca entra em log nem em mensagem de erro.
- A resposta a pendências segue a mesma regra: o ator `requester` só alcança a solicitação cujo e-mail confere.
