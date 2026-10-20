# Injeção de dependência manual

O backend legado importa a conexão de banco como singleton de módulo: 22 arquivos dependem de `src/database/conexion.ts` diretamente, incluindo serviços. Isso torna o Postgres o único banco possível, impede qualquer teste sem banco real e esconde as dependências de cada módulo.

Decidimos que **toda dependência chega pelo construtor** e que a montagem acontece em um único ponto, o *composition root* (`src/container.ts`), que é o único arquivo que sabe quais implementações concretas existem. Não há container de injeção, decorator ou registro global de dependências.

## Alternativas consideradas

- **Container com decorators (`tsyringe`, `typedi`).** Resolveria as dependências sozinho, ao custo de exigir metadata de tipo em runtime (`reflect-metadata`), acoplar o domínio ao framework de injeção e conflita com a proposta de módulos ESM enxutos. A Constructed dependência deixa de ser visível na assinatura.
- **Service locator com registro global.** Reduz boilerplate, mas esconde exatamente a dependência que se quer visível e concentra o estado em um ponto acessível por qualquer módulo.

## Consequências

- Construtores ficam mais longos; a dependência fica explícita e buscável.
- Substituir uma implementação (adaptador em memória, dialeto de banco, logger de teste) é uma linha no composition root.
- A descoberta de dependências é manual. As fábricas por domínio (`createXModule`) compensam isso: o grafo inteiro é legível em um arquivo.
