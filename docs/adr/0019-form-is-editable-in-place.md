---
status: aceito
---

# O formulário é editável in-place; o seed é andaime

O ADR-0012 tomou o formulário da solicitação como entidade configurável, com `forms` → `form_blocks` → `form_fields` e as respostas em `requests.form_answers`. Restava uma decisão: quando o formulário é editado, ele é **versionado** — uma linha nova por revisão, com a solicitação apontando para a versão que foi respondida — ou é **editado no lugar**?

O formulário semeado (quatro blocos, trinta e dois campos) existe hoje por uma razão prática: o frontend atual consome aquela forma. Ele é andaime, não o formulário do produto — no futuro não haverá formulário padrão, e a customização criará formulários novos. Decidimos que o modelo não carrega nenhum desses conceitos.

O formulário é **editado no lugar, sem versionamento**. Um campo alterado é **desativado**, nunca excluído; o tipo de um campo congela assim que ele tem respostas; a chave de um campo é única **por formulário**, e essa unicidade é garantida pelo banco; e as chaves de bloco e de campo são **vocabulário aberto** por formulário — o seed fornece quatro blocos e trinta e dois campos, não um catálogo fixo.

## Alternativas consideradas

- **Versionar.** Cada edição gera uma linha de `forms`, e `requests.form_id` aponta para a versão respondida. É o modelo que dá o histórico da definição e a reprodução exata de uma solicitação antiga. Mas é caro: duplica a definição inteira a cada ajuste, e a pergunta "qual é o formulário atual?" passa a precisar de uma regra de versão vigente que não existe no produto.
- **Congelar o seed.** A versão semeada é imutável e a customização só nasce como formulários novos. Descarta o trabalho de edição e não serve o objetivo da customização.
- **Guardar o valor da resposta junto com a versão do campo.** Cada `form_answers` carregaria o rótulo e as opções do campo no momento da resposta. Resolve a leitura histórica, mas reintroduz a duplicação que motivou o modelo de respostas — e o `form_answers` deixa de ser a linha fina que a busca por chave de campo precisa.

## Consequências

- `requests.form_id` aponta para a definição respondida, e essa definição é a **atual**. Uma solicitação respondida sob a definição antiga pode não ter resposta para um campo que foi criado depois — a API devolve a definição atual e o campo aparece sem resposta.
- `form_fields` ganha `form_id` desnormalizado, para que a unicidade da chave seja do formulário inteiro e não do bloco.
- § 18 do modelo de dados passa a dizer "valores do seed" onde antes enumerava os quatro blocos e dois campos como se fossem o vocabulário.
- O tipo `long_text` fica no vocabulário de `form_fields.type` para os formulários futuros; o seed não o usa.
- `forms.key = solicitacao` é a chave de bootstrap do seed, não o nome do formulário do produto.
