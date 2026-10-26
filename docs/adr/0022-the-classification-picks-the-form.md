---
status: aceito
---

# A classificação é top-level, e escolhe o formulário

Uma **classificação** é um atributo da solicitação que **não é pergunta**: Status, Prioridade e Categoria. O Status vem do ciclo, a Prioridade é calculada, e **só a Categoria é pedida ao solicitante**.

A Categoria tinha uma anatomia que não fechava. O modelo a chamava de **chave promovida** — uma chave do payload que "saiu do formulário e ganhou coluna própria". Mas ela **nunca foi uma pergunta do formulário**: o seed tem 32 campos e a categoria não é um deles (é a 33ª chave do catálogo do legado), e o frontend já a perguntava **hard-coded**, dentro do bloco `demand`, sem que houvesse linha que a declarasse. Dizer que ela "saiu do formulário" era ficção: ela nunca morou lá.

Decidimos que **a classificação é top-level no modelo, fora dos blocos** — e que **a Categoria escolhe o formulário** que o solicitante preenche, por `categories.form_id`. O wire de abertura mantém `demand.category` até o formulário configurável entrar, como a emenda abaixo registra.

Três consequências, e as três são mecânicas:

**A classificação não tem linha em `form_fields`.** `form_fields` é a tabela das perguntas, e a classificação não é uma pergunta. Não há flag, não há linha marcada, e nenhum consumidor da definição precisa se lembrar de um caso especial.

**Não existe resposta para uma classificação.** A resposta aponta para uma linha de `form_fields`, e a classificação não tem uma. O valor vive na coluna da entidade, com FK e NOT NULL.

**A classificação não se remove e não se move.** O NOT NULL da coluna é o que impede a remoção — uma classificação que pode faltar não é classificação, é campo. E ela não se move porque não pertence a bloco nenhum: é pedida **antes** do formulário existir, porque é ela que o escolhe.

E a **pendência** precisa poder pedir a correção de uma classificação, porque o solicitante pode escolher a categoria errada. A pendência então tem **dois** assuntos: um campo do formulário, ou uma classificação. Por isso o item de pendência tem `form_field_id` e `classification_key`, com exclusividade mútua quando há sujeito — a classificação é nomeada pelo vocabulário do código, e a pendência escreve na casa certa: a resposta do campo, ou a coluna da classificação.

**Emenda de compatibilidade.** O modelo mantém a categoria como classificação top-level, fora de qualquer bloco, e é assim que a coluna e a validação funcionam. O **wire** de abertura, porém, mantém `demand.category` enquanto o formulário é fixo: o frontend atual envia a categoria dentro de `demand`, e mudar o payload agora seria uma quebra sem ganho. A promoção para `category` no topo acontece quando o formulário configurável entrar, porque aí o bloco `demand` deixa de ser garantido.

## Alternativas consideradas

- **A classificação dentro de um bloco, como `demand.category`.** Descartada como modelo: ela precede o formulário, então não pode estar dentro de um bloco dele. Mantida temporariamente como local de wire por compatibilidade, com a emenda acima.
- **A linha marcada em `form_fields`** (`is_promoted`). Descartada: transforma a tabela das perguntas numa tabela de perguntas-e-não-perguntas, e o caso especial passa a ser global. Some-se a um problema de tipos: o `type` de uma classificação não tem coluna de valor correspondente, e as suas opções são as **categorias ativas** — um conjunto vivo que não cabe em "opções inline".
- **A classificação como campo comum, e a coluna como projeção da resposta.** Descartada: guarda a categoria duas vezes, e volta ao desenho que a ADR-0012 acabou de abandonar.
- **Vincular o formulário pela outra ponta** (`forms.category_id`). Descartada: impede dois formulários para a mesma categoria, e quem configura é a tela de categorias, que é do `portal-config`.
- **Uma tabela de junção `category_forms`.** Descartada: o vínculo é um para um, e duas categorias que precisarem das mesmas perguntas apontam para o mesmo formulário.

## Consequências

- `portal-config.categories` ganha `form_id`, nullable, FK → `forms.forms.id`. Uma categoria ativa tem sempre um formulário ligado; duas categorias podem apontar o mesmo.
- `requests.form_id` deixa de ser escolhido pelo frontend e passa a ser **derivado da categoria**. A borda resolve a categoria, acha o formulário e valida o payload contra a definição **dele**.
- O payload **atual** continua `{ requester, demand, operational, complementary }`, com a categoria em `demand.category`; a mudança para `{ category, ... }` é adiada para o formulário configurável, e está registrada em §21 do modelo.
- `form_fields` não muda. `ck_form_fields_type` continua com nove valores, e `options` continua sendo só de `select` com opções inline.
- O seed liga as categorias ao formulário seed — que é o andaime. Quando cada categoria tiver o seu, o seed sai.
- A pendência pode pedir a correção da categoria, e a correção é estacionada até a validação, como toda correção.
