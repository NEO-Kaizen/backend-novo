---
status: aceito
---

# O formulário da solicitação é uma entidade configurável

O formulário de abertura de solicitação é, hoje, um conjunto fixo de colunas: a tabela `requests` do legado guarda mais de vinte campos de intake (`need_description`, `process_steps`, `approximate_volume`…), e o catálogo que as pendências usam para validar e fotografar valores — `src/shared/catalog/fieldCatalog.ts`, com 33 chaves `bloco.campo`, rótulos e extração do valor atual — está escrito em TypeScript. O frontend envia o mesmo formulário em quatro blocos (`requester`, `demand`, `operational`, `complementary`).

Para que o formulário possa ser configurável sem reescrever o backend, a definição precisa deixar de ser código. Decidimos que **o formulário é uma entidade**: `forms` → `form_blocks` → `form_fields`, no novo domínio `forms`, que é o catálogo das definições; e que **as respostas vivem com o sujeito respondido** — `requests.form_answers` —, referenciando `forms.form_fields.id` por chave estrangeira, como `requests.category_id` referencia `portal-config.categories.id`.

A **chave do campo é a chave do contrato**: `form_fields.key` guarda a chave que o frontend envia (`processName`, `desiredDeadline`) e `form_blocks.key` guarda a chave do bloco (`demand`). A definição passa a ser o vocabulário único do formulário — o legado tinha dois, `approximate_volume` no banco e `volumetry` no payload — e a API lê e devolve a mesma forma aninhada, agrupando as respostas por bloco.

A tabela `request_details` desaparece: os valores do formulário passam a ser linhas de `form_answers`, com colunas de valor tipadas (`value_text`, `value_number`, `value_date`, `value_boolean`, `value_json`). O catálogo de 33 campos é o seed do formulário.

## Alternativas consideradas

- **Manter as colunas tipadas e adicionar uma definição decorativa.** A tipagem some, e a lista de campos passa a existir em dois lugares — o seed e as colunas — que divergem no primeiro ajuste. A definição não habilitaria nada.
- **Um blob JSON por solicitação.** Sem junção para ler os valores, mas sem integridade com os campos, sem índice por campo, e com a forma do dado dependente de cada chamada. A busca por e-mail e o filtro por prazo deixariam de ser consultas.
- **Definição e respostas no mesmo domínio.** O `forms` guardaria também as respostas, com um sujeito polimórfico. Teria a mesma fragilidade de referência polimórfica que a auditoria já tem.
- **Definição como catálogo, respostas com o sujeito.** Escolhido: cada coisa tem um dono, e o vínculo entre elas é uma chave estrangeira comum.

## Consequências

- As consultas que leem `process_name` e `desired_deadline` — fila, dashboard e exportação — passam a juntar as respostas por chave de campo.
- **O banco não impõe mais os limites do campo.** O limite mora na definição e o valor em outra linha: a validação é da aplicação, na borda, guiada pela definição. É o preço da generalização, e é o motivo de a definição ser a fonte única.
- O tipo de um campo não pode mudar depois que ele tem respostas; campos são desativados, nunca excluídos.
- `pending_items.requested_fields` — um json de chaves — ganha a tabela filha `pending_item_fields`, que referencia `form_fields.id`.
- A classificação da solicitação (a categoria) deixa de ser coluna e passa a ser a resposta de `demand.category`, com o `id` da categoria como valor — a triagem a troca reescrevendo a resposta.
- Vários formulários podem existir: o de abertura é um deles, e um formulário de outro assunto tem a mesma forma.
