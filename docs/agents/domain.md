# Documentação de domínio

Como os skills de engenharia devem consumir a documentação de domínio deste repositório ao explorar o código.

## Antes de explorar, leia estes

- **`GLOSSARY.md`** na raiz do repositório, ou
- **`GLOSSARY-MAP.md`** na raiz, se existir: ele aponta para um `GLOSSARY.md` por contexto. Leia cada um que seja relevante ao tópico.
- **`docs/adr/`**: leia os ADRs que tocam a área em que você está prestes a trabalhar. Em repositórios multi-context, verifique também `src/<context>/docs/adr/` para decisões específicas do contexto.
- **`docs/03-Data-Model.md`**, se existir: o modelo de dados é a especificação do schema — tabelas, colunas, relações e invariantes. Leia a seção do domínio antes de tocar em repositório, migration ou seed.

Se algum desses arquivos não existir, **prossiga silenciosamente**. Não sinalize a ausência; não sugira criá-los de antemão. O skill `/domain-modeling` (acessado via `/grill-with-docs` e `/improve-codebase-architecture`) os cria sob demanda quando termos ou decisões forem realmente resolvidos.

## Estrutura de arquivos

Repositório single-context (a maioria):

```
/
├── GLOSSARY.md
├── docs/adr/
│   ├── 0001-event-sourced-orders.md
│   └── 0002-postgres-for-write-model.md
└── src/
```

Repositório multi-context (presença de `GLOSSARY-MAP.md` na raiz):

```
/
├── GLOSSARY-MAP.md
├── docs/adr/                          ← decisões sistêmicas
└── src/
    ├── ordering/
    │   ├── GLOSSARY.md
    │   └── docs/adr/                  ← decisões específicas do contexto
    └── billing/
        ├── GLOSSARY.md
        └── docs/adr/
```

## Use o vocabulário do glossário

Quando sua saída nomear um conceito de domínio (em título de issue, proposta de refatoração, hipótese, nome de teste), use o termo como definido em `GLOSSARY.md`. Não derive para sinônimos que o glossário evita explicitamente.

Se o conceito de que você precisa ainda não está no glossário, isso é um sinal: ou você está inventando linguagem que o projeto não usa (reconsidere), ou há uma lacuna real (anote para `/domain-modeling`).

## Sinalize conflitos com ADRs

Se sua saída contradiz um ADR existente, exponha isso explicitamente em vez de sobrescrevê-lo silenciosamente:

> _Contradiz o ADR-0007 (pedidos event-sourced), mas vale reabrir porque…_
