# GLOSSARY.md Format

Output language: Portuguese.

## Structure

```md
# {Nome do contexto}

{Descrição em uma ou duas frases sobre o que é este contexto e por que ele existe.}

## Linguagem

**Pedido**:
{Descrição em uma ou duas frases do termo}
_Evitar_: Compra, transação

**Fatura**:
Uma solicitação de pagamento enviada a um cliente após a entrega.
_Evitar_: Conta, cobrança

**Cliente**:
Uma pessoa ou organização que faz pedidos.
_Evitar_: Consumidor, comprador, conta
```

## Rules

- **Be opinionated.** When multiple words exist for the same concept, pick the best one and list the others under `_Evitar_`.
- **Keep definitions tight.** One or two sentences max. Define what it IS, not what it does.
- **Only include terms specific to this project's context.** General programming concepts (timeouts, error types, utility patterns) don't belong even if the project uses them extensively. Before adding a term, ask: is this a concept unique to this context, or a general programming concept? Only the former belongs.
- **Group terms under subheadings** when natural clusters emerge. If all terms belong to a single cohesive area, a flat list is fine.

## Single vs multi-context repos

**Single context (most repos):** One `GLOSSARY.md` at the repo root.

**Multiple contexts:** A `GLOSSARY-MAP.md` at the repo root lists the contexts, where they live, and how they relate to each other:

```md
# Mapa de glossários

## Contextos

- [Pedidos](./src/ordering/GLOSSARY.md): recebe e acompanha pedidos de clientes
- [Faturamento](./src/billing/GLOSSARY.md): gera faturas e processa pagamentos
- [Expedição](./src/fulfillment/GLOSSARY.md): gerencia separação e envio em armazém

## Relações

- **Pedidos → Expedição**: Pedidos emite eventos `OrderPlaced`; Expedição os consome para iniciar a separação
- **Expedição → Faturamento**: Expedição emite eventos `ShipmentDispatched`; Faturamento os consome para gerar faturas
- **Pedidos ↔ Faturamento**: Tipos compartilhados para `CustomerId` e `Money`
```

The skill infers which structure applies:

- If `GLOSSARY-MAP.md` exists, read it to find contexts
- If only a root `GLOSSARY.md` exists, single context
- If neither exists, create a root `GLOSSARY.md` lazily when the first term is resolved

When multiple contexts exist, infer which one the current topic relates to. If unclear, ask.
