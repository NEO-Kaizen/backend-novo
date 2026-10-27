---
status: aceito
---

# O modelo de dados documentado é a especificação

O backend legado tem 55 arquivos de migration e nenhuma definição do modelo: o schema existe apenas como sequência de migrations, e quem lê o banco precisa remontar as tabelas, as colunas e os relacionamentos a partir do histórico de mudanças — trabalho que a [ADR-0004](./0004-domain-owned-schema-and-migrations.md) atacou ao dar a cada domínio a posse do seu schema, mas que continuou sem resposta para quem precisa **entender** o modelo.

Decidimos que **o modelo de dados é um documento versionado e normativo**: [`docs/03-Data-Model.md`](../03-Data-Model.md) descreve todas as tabelas com colunas, tipos, nulabilidade, defaults, constraints, relações, índices e invariantes, e a definição em Knex de cada domínio implementa esse documento. Uma mudança de schema que não atualiza o documento é **incompleta** — a mesma regra que o repositório já aplica a contrato de API e a decisão de arquitetura.

O documento registra também as **regras de negócio preservadas do legado** em cada domínio, de modo que a remodelagem possa ser revisada contra o comportamento que já existe, e não apenas contra a forma nova.

## Alternativas consideradas

- **O código é a única fonte da verdade.** A definição em Knex já descreve o schema com precisão, e um documento que a duplica inevitavelmente diverge. Ler o modelo passa a exigir abrir o código para saber o tipo de uma coluna, e o modelo — as entidades, as relações, o porquê — deixa de existir como objeto. Foi o que aconteceu com o legado.
- **Documento gerado a partir das migrations.** Um script que extrai o schema e o escreve em Markdown nunca está desatualizado. Mas ele documenta o que existe, não o que se pretende: perde as invariantes, as decisões e as regras preservadas, que são justamente o que não está no DDL. Também exige uma ferramenta de execução, que o repositório ainda não escolheu.
- **Documento apenas com diagramas e intenções.** Mais barato de manter, mas quem precisa saber o nome exato de uma coluna ou a nulabilidade de um campo não encontra resposta.
- **Especificação mantida à mão.** Aceita o custo de sincronização e o resolve com regra de revisão: o documento é a especificação, o código a implementa, e a divergência é tratada como defeito. Escolhido.

## Consequências

- O checklist de revisão ganha um item: schema alterado, documento atualizado.
- A documentação derivada do banco vive em [`docs/db/`](../db/README.md) — referência do schema, ERD, DBML, seeds e operações. Ela é **não normativa** e é mantida à mão; toda mudança de schema atualiza a especificação e os derivados no mesmo pull request. A paridade é verificada na revisão, pelo checklist de [`docs/db/README.md`](../db/README.md).
- A lista de colunas é a especificação — não uma documentação paralela. Quando as duas divergem, o defeito está no código.
- O documento é o artefato de revisão do remodelamento: quem aprova o modelo olha o documento, não as migrations.
- Quando as ferramentas forem decididas, um script pode comparar o documento com a definição em Knex e falhar quando divergirem; até lá, a verificação é humana e é feita na revisão.
- O documento cresce com o modelo. Por isso cada domínio tem uma seção própria, e a tabela de catálogo no final permite navegar sem ler tudo.
