---
status: aceito
---

# O solicitante é uma resposta da solicitação, não uma tabela

O legado guarda o solicitante em `requesters`: uma linha identificada pelo e-mail corporativo, criada e atualizada a cada abertura (`upsertRequester`), com nome, e-mail, área, departamento, gestor e contato adicional. A solicitação aponta para essa linha, e o frontend — na abertura, no bloco `requester` do payload — manda o mesmo dado que a linha já guarda.

A tabela tem três problemas estruturais. A linha é identificada por e-mail, então duas pessoas com a mesma caixa corporativa viram a mesma pessoa. A linha acumula, com a última escrita valendo, então a fila mostra o nome de hoje em uma solicitação de ontem. E a mesma linha é ao mesmo tempo a cópia da conta ("Meus dados"), a cópia submetida e a identidade da pessoa.

Abrir solicitação sem autenticação agrava o primeiro ponto: não há conta para pendurar os dados, e o único jeito de guardá-los é inventar uma linha a partir de um e-mail.

Decidimos que **o bloco `requester` é parte do formulário** ([ADR-0012](./0012-form-is-a-configurable-entity.md)): o que o solicitante preenche é uma resposta da solicitação, e fica em `form_answers`. A conta passa a guardar a própria cópia de contato — `users.area`, `users.department`, `users.manager_name`, `users.additional_contact` — que é o que "Meus dados" edita e o que o formulário pré-preenche. `requests.requester_user_id`, anulável, é o único vínculo com a conta: uma solicitação anônima não tem nenhum.

A tabela `requesters` é removida.

## Alternativas consideradas

- **Manter `requesters` e tirar o bloco `requester` do formulário.** O formulário cobriria só o corpo da solicitação e a identidade ficaria numa linha por e-mail — que é a opção que o legado já pratica, com as duas consequências acima.
- **Manter `requesters` como registro de pessoas e as respostas como retrato.** O registro aceleraria a busca por e-mail e a leitura da fila, ao custo de manter duas cópias do nome e do e-mail — uma delas, a do registro, volátil.
- **A conta guarda o contato e a solicitação guarda o retrato.** Escolhido: as cópias são de fatos diferentes (o que a conta tem hoje, e o que foi submetido naquela solicitação), e a fila mostra o que foi submetido.

## Consequências

- A fila e a exportação leem o nome e o e-mail do solicitante das respostas.
- A busca por e-mail vira um índice sobre as respostas (`form_answers` indexado por `field_id` e `value_text`), em vez de uma coluna de `requesters`.
- A verificação de titularidade do acompanhamento passa a comparar contra a resposta da própria solicitação — e não contra uma linha que pode ter mudado depois.
- A abertura no modo autenticado continua ignorando o nome e o e-mail do payload, em favor dos da sessão.
- O glossário continua descrevendo o Solicitante como a pessoa que registra a solicitação; ele deixa de ser uma tabela, e não deixa de ser um conceito.
