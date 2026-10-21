---
status: aceito
---

# A chave promovida não tem linha no formulário

Uma **chave promovida** é uma chave do payload que deixou de ser pergunta e virou coluna da entidade: hoje, `demand.category` → `requests.category_id` e `newCategory` → `triages.new_category_id`. A ADR-0012 uptake a promoção para tirar a classificação do formulário — o formulário não pergunta, e a coluna guarda o valor.

Sobrou uma pergunta: **a chave promovida tem linha em `form_fields`?**

A tentação é dizer que sim, marcada — uma flag `is_promoted` na linha, para que a pendência possa pedir a correção da categoria endereçando-a por `form_field_id`, como faz com qualquer campo.

Decidimos que **não**. A chave promovida **não tem linha em `form_fields`**, e a pendência a endereça **pela chave**, em `pending_item_fields.promoted_key`.

O motivo é que `form_fields` é a tabela das **perguntas** — está escrito no § 18.3 do modelo de dados e na definição de *Campo* no glossário. Uma chave promovida, pela própria definição de promover, **deixou de ser pergunta**. Pôr uma não-pergunta na tabela das perguntas exige uma flag, e a flag exige que todo consumidor da tabela se lembre dela: o renderizador do formulário teria de filtrar, o validador da borda teria um ramo novo, o escritor de resposta teria de recusar respostas de linha promovida — e essa última regra **não é imposta pelo banco**, porque uma `ck_` não enxerga outra tabela.

Some-se a isso que o conjunto das chaves promovidas é **do código e fixo** — a customização do formulário "não toca nas classificações" (ADR-0012). Uma flag no banco só poderia **espelhar** um fato que o código decide, e portanto divergir dele.

E há um argumento de contrato: o frontend nomeia o campo pendente **por chave**, não por id — o corpo do pedido pendente carrega `fieldKey`, e não a identidade do campo. A FK `pending_item_fields.form_field_id` foi uma melhoria da ADR-0012, não um contrato de que o cliente dependa.

Com a chave promovida fora de `form_fields`, a consequência é mecânica e boa: **não existe resposta para uma chave promovida**, porque a resposta aponta para uma linha de `form_fields`, e a chave promovida não tem uma. E a pendência ganha uma coluna — `promoted_key`, com o vocabulário do código espelhado em `ck_` — e uma constraint que diz que um pedido é de um campo **ou** de uma chave promovida, nunca dos dois.

## Alternativas consideradas

- **A linha marcada** (`form_fields.is_promoted`). Descartada: transforma a tabela das perguntas numa tabela de perguntas-e-não-perguntas, e o caso especial passa a ser global — todo consumidor da definição passa a ter um ramo. Some-se a um problema de tipos: o `type` de uma chave promovida não tem coluna de valor correspondente, e as suas opções são as **categorias ativas** — um conjunto vivo que não cabe em "opções inline".
- **A chave promovida como campo comum, e a coluna como projeção da resposta.** Descartada: guarda a categoria duas vezes, viola a regra de não armazenar o mesmo conjunto duas vezes como coluna de classificação, e volta ao desenho que a ADR-0012 acabou de abandonar.
- **`form_fields` com uma coluna que diga onde o valor mora** (`value_column`). Descartada: a única forma útil nomeia a coluna de **outro domínio** (`requests.category_id`, `triages.new_category_id`), por string e sem integridade referencial. Referência por nome de coluna não é referência a entidade, e o catálogo de formulários passaria a nomear colunas que não possui.
- **A pendência não corrige a classificação.** Descartada: no legado, `demand.category` era uma das chaves marcáveis, e a correção escrevia a coluna.

## Consequências

- `form_fields` não muda. `ck_form_fields_type` continua com nove valores, e `options` continua sendo só de `select` com opções inline.
- `pending_item_fields` ganha `promoted_key` e `corrected_value`; `form_field_id` passa a ser nulável; nascem a constraint de exclusividade mútua e a unicidade da chave promovida na pendência.
- **A correção fica estacionada até a validação.** O solicitante responde, o valor corrigido espera, e quem aplica é a validação — que reescreve a resposta do campo ou a coluna da entidade. Reabrir descarta a correção. É o que o legado fazia, e é o que sobrevive ao reopen.
- O mapa chave → coluna é o **catálogo de chaves promovidas**, em código, e é a fonte da verdade.
- A pendência pode pedir a correção da categoria, e o solicitante pode corrigi-la — o que o modelo novo tinha perdido ao promover a chave.
